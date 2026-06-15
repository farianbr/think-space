import { prisma } from "../prismaClient.js";
import { getIo } from "./io.js";

/**
 * Record a board activity event.
 *
 * Best-effort: failures are logged but never thrown, so activity logging can be
 * sprinkled across the hot paths (note create/update, member changes) without
 * risking the primary operation. Also bumps Board.lastActivityAt and broadcasts
 * the new entry to the board room for live activity panels.
 */
export async function logActivity({ boardId, actorId, type, meta }) {
  if (!boardId || !type) return null;
  try {
    const activity = await prisma.activity.create({
      data: { boardId, actorId: actorId || null, type, meta: meta ?? undefined },
      include: { actor: { select: { id: true, name: true, email: true } } },
    });

    // Touch lastActivityAt without disturbing updatedAt semantics elsewhere.
    await prisma.board
      .update({ where: { id: boardId }, data: { lastActivityAt: activity.createdAt } })
      .catch(() => {});

    const io = getIo();
    if (io) io.to(`room:board:${boardId}`).emit("activity:new", { boardId, activity });

    return activity;
  } catch (err) {
    console.error("logActivity error", err?.message || err);
    return null;
  }
}
