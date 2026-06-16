import { prisma } from "../prismaClient.js";
import { getIo } from "../lib/io.js";
import { notify } from "../lib/notify.js";
import { logActivity } from "../lib/activity.js";
import { syncUserBoardRole } from "../lib/socketRoles.js";
import { normalizeRole } from "../lib/permissions.js";

/**
 * Turn a pending invite into a board membership for `user`, idempotently. Marks
 * the invite accepted, syncs the live role, emits the same realtime events as a
 * direct add, and returns the created/existing membership.
 */
async function redeemInvite(invite, user) {
  const role = normalizeRole(invite.role);

  const member = await prisma.boardMember.upsert({
    where: { boardId_userId: { boardId: invite.boardId, userId: user.id } },
    update: {},
    create: { boardId: invite.boardId, userId: user.id, role },
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  await prisma.invite.update({
    where: { id: invite.id },
    data: { acceptedAt: new Date() },
  });

  const board = await prisma.board.findUnique({
    where: { id: invite.boardId },
    select: { id: true, title: true, ownerId: true },
  });

  const io = getIo();
  if (io && board) {
    io.to(`room:board:${board.id}`).emit("member:added", {
      boardId: board.id,
      member: { id: member.id, role: member.role, user: member.user, userId: member.userId },
      actorId: invite.invitedById || null,
    });
    io.to(`user:${user.id}`).emit("board:added", { boardId: board.id, board: { id: board.id } });
  }

  syncUserBoardRole(user.id, invite.boardId, member.role);

  logActivity({
    boardId: invite.boardId,
    actorId: invite.invitedById || user.id,
    type: "member.added",
    meta: { userId: user.id, email: user.email, role: member.role, via: "invite" },
  });

  // Tell the inviter their invitation was accepted.
  if (invite.invitedById && invite.invitedById !== user.id) {
    await notify({
      userId: invite.invitedById,
      type: "member_added",
      boardId: invite.boardId,
      actorId: user.id,
      data: { boardTitle: board?.title, memberName: user.name || user.email },
    });
  }

  return member;
}

/**
 * Apply every pending invite addressed to a (just-authenticated) user's email.
 * Called after registration so invited newcomers land in their boards instantly.
 * Best-effort: failures are logged, never thrown.
 */
export async function applyPendingInvitesForUser(user) {
  if (!user?.email) return 0;
  try {
    const invites = await prisma.invite.findMany({
      where: { email: { equals: user.email, mode: "insensitive" }, acceptedAt: null },
    });
    let count = 0;
    for (const invite of invites) {
      if (invite.expiresAt && invite.expiresAt < new Date()) continue;
      await redeemInvite(invite, user);
      count++;
    }
    return count;
  } catch (err) {
    console.error("applyPendingInvitesForUser error", err?.message || err);
    return 0;
  }
}

/**
 * GET /api/invites/:token
 * Public preview so the accept page can show who invited whom before sign-in.
 */
export async function getInvitePreview(req, res) {
  try {
    const invite = await prisma.invite.findUnique({
      where: { token: req.params.token },
      include: {
        board: { select: { title: true } },
        invitedBy: { select: { name: true, email: true } },
      },
    });
    if (!invite) return res.status(404).json({ message: "Invitation not found" });

    return res.json({
      invite: {
        email: invite.email,
        role: invite.role,
        boardTitle: invite.board?.title || "a board",
        inviterName: invite.invitedBy?.name || invite.invitedBy?.email || "Someone",
        accepted: Boolean(invite.acceptedAt),
        expired: Boolean(invite.expiresAt && invite.expiresAt < new Date()),
      },
    });
  } catch (err) {
    console.error("getInvitePreview error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/invites/:token/accept  (auth required)
 * The signed-in user must match the invited email. Returns { boardId }.
 */
export async function acceptInvite(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const invite = await prisma.invite.findUnique({ where: { token: req.params.token } });
    if (!invite) return res.status(404).json({ message: "Invitation not found" });

    if (invite.expiresAt && invite.expiresAt < new Date())
      return res.status(410).json({ message: "This invitation has expired" });

    if (invite.acceptedAt)
      return res.json({ boardId: invite.boardId, message: "Already accepted" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true },
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (user.email.toLowerCase() !== invite.email.toLowerCase())
      return res.status(403).json({
        message: `This invitation was sent to ${invite.email}. Sign in with that address to accept.`,
      });

    await redeemInvite(invite, user);
    return res.json({ boardId: invite.boardId, message: "Invitation accepted" });
  } catch (err) {
    console.error("acceptInvite error", err);
    return res.status(500).json({ message: "Server error" });
  }
}
