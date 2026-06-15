import { prisma } from "../prismaClient.js";

/** GET /api/notifications?unread=1&limit= — current user's notifications. */
export async function getNotifications(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const limit = Math.min(Number(req.query.limit) || 30, 100);
    const where = { userId };
    if (req.query.unread === "1") where.readAt = null;

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: "desc" }, take: limit }),
      prisma.notification.count({ where: { userId, readAt: null } }),
    ]);

    return res.json({ notifications, unreadCount });
  } catch (err) {
    console.error("getNotifications error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/** PATCH /api/notifications/:id/read — mark one read (owner only). */
export async function markNotificationRead(req, res) {
  try {
    const userId = req.user?.id;
    const { id } = req.params;
    const result = await prisma.notification.updateMany({
      where: { id, userId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.json({ ok: true, updated: result.count });
  } catch (err) {
    console.error("markNotificationRead error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/** PATCH /api/notifications/read-all — mark all of the user's notifications read. */
export async function markAllNotificationsRead(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });
    await prisma.notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
    return res.json({ ok: true });
  } catch (err) {
    console.error("markAllNotificationsRead error", err);
    return res.status(500).json({ message: "Server error" });
  }
}
