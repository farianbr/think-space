import { prisma } from "../prismaClient.js";
import { getIo } from "../lib/io.js";
import { createBoardSchema, updateBoardSchema } from "../validation/schemas.js";
import { logActivity } from "../lib/activity.js";

// Shared shape so list and detail payloads carry what the cards/sidebar need.
const boardListInclude = {
  owner: { select: { id: true, name: true, email: true } },
  members: {
    take: 8,
    include: { user: { select: { id: true, name: true, email: true } } },
  },
  _count: { select: { notes: true, members: true } },
};

/** Attach `isStarred` for the requesting user to a list of boards. */
async function withStars(boards, userId) {
  if (boards.length === 0) return [];
  const stars = await prisma.boardStar.findMany({
    where: { userId, boardId: { in: boards.map((b) => b.id) } },
    select: { boardId: true },
  });
  const starred = new Set(stars.map((s) => s.boardId));
  return boards.map((b) => ({ ...b, isStarred: starred.has(b.id) }));
}

/**
 * GET /api/boards/my?filter=all|owned|shared|favorites|archived
 * Returns boards the user owns or collaborates on, filtered for library tabs.
 */
export async function getMyBoards(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const filter = String(req.query.filter || "all");
    const access = { OR: [{ ownerId: userId }, { members: { some: { userId } } }] };

    let where;
    switch (filter) {
      case "owned":
        where = { ownerId: userId, isArchived: false };
        break;
      case "shared":
        where = { members: { some: { userId } }, ownerId: { not: userId }, isArchived: false };
        break;
      case "favorites":
        where = { AND: [access, { isArchived: false }, { stars: { some: { userId } } }] };
        break;
      case "archived":
        where = { AND: [access, { isArchived: true }] };
        break;
      default:
        where = { AND: [access, { isArchived: false }] };
    }

    const boards = await prisma.board.findMany({
      where,
      orderBy: [{ lastActivityAt: { sort: "desc", nulls: "last" } }, { updatedAt: "desc" }],
      include: boardListInclude,
    });

    return res.json({ boards: await withStars(boards, userId) });
  } catch (err) {
    console.error("getMyBoards error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/boards
 * Create a new board (optionally with description/icon/color).
 */
export async function createBoard(req, res) {
  const userId = req.user?.id;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const parsed = createBoardSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: "Title required (1-120 chars)" });

  try {
    const board = await prisma.board.create({
      data: { ...parsed.data, ownerId: userId, lastActivityAt: new Date() },
      include: boardListInclude,
    });

    logActivity({ boardId: board.id, actorId: userId, type: "board.created", meta: { title: board.title } });

    return res.status(201).json({ board: { ...board, isStarred: false } });
  } catch (err) {
    console.error("createBoard error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * PATCH /api/boards/:boardId
 * Rename / edit / archive / restore. Owner only.
 */
export async function updateBoard(req, res) {
  const userId = req.user?.id;
  const boardId = req.params.boardId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const parsed = updateBoardSchema.safeParse(req.body);
  if (!parsed.success)
    return res.status(400).json({ message: parsed.error.issues?.[0]?.message || "Invalid payload" });

  try {
    const existing = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, ownerId: true, title: true, isArchived: true },
    });
    if (!existing) return res.status(404).json({ message: "Board not found" });
    if (existing.ownerId !== userId)
      return res.status(403).json({ message: "Only the owner can edit this board" });

    const board = await prisma.board.update({
      where: { id: boardId },
      data: { ...parsed.data, lastActivityAt: new Date() },
      include: boardListInclude,
    });

    const io = getIo();
    if (io) io.to(`room:board:${boardId}`).emit("board:updated", { boardId, board, actorId: userId });

    if (parsed.data.isArchived !== undefined && parsed.data.isArchived !== existing.isArchived) {
      logActivity({
        boardId,
        actorId: userId,
        type: parsed.data.isArchived ? "board.archived" : "board.restored",
        meta: { title: board.title },
      });
    } else if (parsed.data.title && parsed.data.title !== existing.title) {
      logActivity({ boardId, actorId: userId, type: "board.renamed", meta: { from: existing.title, to: board.title } });
    }

    return res.json({ board: { ...board, isStarred: false } });
  } catch (err) {
    console.error("updateBoard error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * DELETE /api/boards/:boardId  (owner only)
 */
export async function deleteBoard(req, res) {
  const userId = req.user?.id;
  const boardId = req.params.boardId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) return res.status(404).json({ message: "Board not found" });
  if (board.ownerId !== userId)
    return res.status(403).json({ message: "Only owner can delete" });

  await prisma.board.delete({ where: { id: boardId } });

  const io = getIo();
  if (io)
    io.to(`room:board:${boardId}`).emit("board:deleted", { boardId, actorId: userId });

  res.json({ ok: true });
}

/** POST /api/boards/:boardId/star — favorite a board for the current user. */
export async function starBoard(req, res) {
  const userId = req.user?.id;
  const boardId = req.params.boardId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    const board = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true, ownerId: true } });
    if (!board) return res.status(404).json({ message: "Board not found" });

    const member =
      board.ownerId === userId ||
      (await prisma.boardMember.findFirst({ where: { boardId, userId }, select: { id: true } }));
    if (!member) return res.status(403).json({ message: "Forbidden" });

    await prisma.boardStar.upsert({
      where: { userId_boardId: { userId, boardId } },
      update: {},
      create: { userId, boardId },
    });
    return res.json({ ok: true, isStarred: true });
  } catch (err) {
    console.error("starBoard error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/** DELETE /api/boards/:boardId/star — unfavorite. */
export async function unstarBoard(req, res) {
  const userId = req.user?.id;
  const boardId = req.params.boardId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  try {
    await prisma.boardStar.deleteMany({ where: { userId, boardId } });
    return res.json({ ok: true, isStarred: false });
  } catch (err) {
    console.error("unstarBoard error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * GET /api/boards/:boardId
 * Board details if the user has access.
 */
export async function getBoardById(req, res) {
  try {
    const boardId = req.params.boardId;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      include: boardListInclude,
    });

    if (!board) return res.status(404).json({ message: "Board not found" });

    if (board.ownerId !== userId) {
      const member = await prisma.boardMember.findFirst({ where: { boardId, userId } });
      if (!member) return res.status(403).json({ message: "Forbidden" });
    }

    const star = await prisma.boardStar.findFirst({ where: { userId, boardId }, select: { id: true } });
    return res.json({ board: { ...board, isStarred: !!star } });
  } catch (err) {
    console.error("getBoardById error", err);
    return res.status(500).json({ message: "Server error" });
  }
}
