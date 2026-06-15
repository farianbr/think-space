import { prisma } from "../prismaClient.js";
import { getIo } from "./io.js";

/**
 * Create a notification for a user and push it live to their socket room
 * (`user:<id>`, joined on connection in server.js). Best-effort.
 */
export async function notify({ userId, type, boardId, actorId, data }) {
  if (!userId || !type) return null;
  try {
    // Respect the recipient's notification preferences. A type is muted only
    // when explicitly set to false in preferences.notifications; default is on.
    const recipient = await prisma.user.findUnique({
      where: { id: userId },
      select: { preferences: true },
    });
    if (recipient?.preferences?.notifications?.[type] === false) return null;

    const notification = await prisma.notification.create({
      data: {
        userId,
        type,
        boardId: boardId || null,
        actorId: actorId || null,
        data: data ?? undefined,
      },
    });

    const io = getIo();
    if (io) io.to(`user:${userId}`).emit("notification:new", { notification });

    return notification;
  } catch (err) {
    console.error("notify error", err?.message || err);
    return null;
  }
}
