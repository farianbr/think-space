import { PrismaClient } from "@prisma/client";
import { getIo } from "../lib/io.js";
const prisma = new PrismaClient();

/**
 * GET /api/boards/my
 * Returns boards where req.user is owner or member
 */
export async function getMyBoards(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const boards = await prisma.board.findMany({
      where: {
        OR: [{ ownerId: userId }, { members: { some: { userId } } }],
      },
      orderBy: { updatedAt: "desc" },
      include: {
        _count: { select: { notes: true } }, //note count
      },
    });

    return res.json({ boards });
  } catch (err) {
    console.error("getMyBoards error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/boards
 * Create a new board
 */
export async function createBoard(req, res) {
  const userId = req.user?.id;
  const { title } = req.body ?? {};
  if (!userId) return res.status(401).json({ message: "Unauthorized" });
  if (!title || typeof title !== "string")
    return res.status(400).json({ message: "Title required" });

  try {
    const board = await prisma.board.create({
      data: { title, ownerId: userId },
    });

    return res.status(201).json({ board });
  } catch (err) {
    console.error("createBoard error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * DELETE /api/boards/:boardId
 * Deletes board if user is owner; also removes members
 */
export async function deleteBoard(req, res) {
  const userId = req.user?.id;
  const boardId = req.params.boardId;
  if (!userId) return res.status(401).json({ message: "Unauthorized" });

  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) return res.status(404).json({ message: "Board not found" });
  if (board.ownerId !== userId)
    return res.status(403).json({ message: "Only owner can delete" });

  // remove members first via existing controller if needed
  // or cascade delete will handle members if schema is set up
  await prisma.board.delete({ where: { id: boardId } });

  // emit removal to any clients connected to this board
  const io = getIo();
  if (io)
    io.to(`room:board:${boardId}`).emit("board:deleted", {
      boardId,
      actorId: userId,
    });

  res.json({ ok: true });
}
