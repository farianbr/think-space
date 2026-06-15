import { prisma } from "../prismaClient.js";
import { userCanAccessBoard } from "../lib/boardAccess.js";

const actorSelect = { actor: { select: { id: true, name: true, email: true } } };

/** GET /api/boards/:boardId/activity?limit=  — activity for one board. */
export async function getBoardActivity(req, res) {
  try {
    const { boardId } = req.params;
    const userId = req.user?.id;
    if (!(await userCanAccessBoard(boardId, userId)))
      return res.status(403).json({ message: "Forbidden" });

    const limit = Math.min(Number(req.query.limit) || 40, 100);
    const activities = await prisma.activity.findMany({
      where: { boardId },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: actorSelect,
    });
    return res.json({ activities });
  } catch (err) {
    console.error("getBoardActivity error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * GET /api/activity?limit=  — workspace feed across every board the user can see.
 * Powers the dashboard "Team activity" section.
 */
export async function getWorkspaceActivity(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const boards = await prisma.board.findMany({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      select: { id: true },
    });
    const boardIds = boards.map((b) => b.id);
    if (boardIds.length === 0) return res.json({ activities: [] });

    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const activities = await prisma.activity.findMany({
      where: { boardId: { in: boardIds } },
      orderBy: { createdAt: "desc" },
      take: limit,
      include: { ...actorSelect, board: { select: { id: true, title: true } } },
    });
    return res.json({ activities });
  } catch (err) {
    console.error("getWorkspaceActivity error", err);
    return res.status(500).json({ message: "Server error" });
  }
}
