import { prisma } from "../prismaClient.js";

import {
  addMemberSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from "../validation/schemas.js";
import { getIo } from "../lib/io.js";
import { notify } from "../lib/notify.js";
import { logActivity } from "../lib/activity.js";
import { getUserBoardRole } from "../lib/boardAccess.js";
import { canManageMembers, normalizeRole } from "../lib/permissions.js";
import { syncUserBoardRole } from "../lib/socketRoles.js";

/**
 * Authorize a member-management action. Returns { board } on success or
 * { error: { status, message } } to send back. Owners and admins may manage
 * members; admins are barred from touching the owner or other admins, and from
 * granting the admin role, so they can never escalate past the owner.
 */
async function authorizeManage({ boardId, actorId, targetUserId, targetRole, nextRole }) {
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true, ownerId: true, title: true },
  });
  if (!board) return { error: { status: 404, message: "Board not found" } };

  const actorRole = await getUserBoardRole(boardId, actorId);
  if (!canManageMembers(actorRole))
    return { error: { status: 403, message: "You can't manage members on this board" } };

  // Only the owner may grant, revoke, or modify the admin role.
  const isOwner = actorRole === "owner";
  if (!isOwner) {
    if (targetUserId && targetUserId === board.ownerId)
      return { error: { status: 403, message: "Only the owner can manage the owner" } };
    if (normalizeRole(targetRole) === "admin" || normalizeRole(nextRole) === "admin")
      return { error: { status: 403, message: "Only the owner can manage admins" } };
  }

  return { board, actorRole };
}

/** Notify existing board members (besides the actor and newcomer) of a new collaborator. */
async function notifyMemberAdded({ boardId, board, actorId, newMember }) {
  const members = await prisma.boardMember.findMany({
    where: { boardId },
    select: { userId: true },
  });
  const recipients = new Set([board.ownerId, ...members.map((m) => m.userId)]);
  recipients.delete(actorId);
  recipients.delete(newMember.userId);

  const memberName = newMember.user?.name || newMember.user?.email || "Someone";
  for (const userId of recipients) {
    await notify({
      userId,
      type: "member_added",
      boardId,
      actorId,
      data: { boardTitle: board.title, memberName },
    });
  }
}
/**
 * GET /api/boards/:boardId/members
 * - allowed: board owner OR any board member
 */
export async function getBoardMembers(req, res) {
  try {
    const boardId = req.params.boardId;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { 
        id: true, 
        ownerId: true,
        createdAt: true,
        owner: { select: { id: true, email: true, name: true } }
      },
    });

    if (!board) return res.status(404).json({ message: "Board not found" });

    // owner can view, or members can view
    if (board.ownerId !== userId) {
      const member = await prisma.boardMember.findFirst({
        where: { boardId, userId },
      });
      if (!member) return res.status(403).json({ message: "Forbidden" });
    }

    const members = await prisma.boardMember.findMany({
      where: { boardId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    // Add the board owner to the members list if they're not already there
    const allMembers = [...members];
    if (board.ownerId && board.owner) {
      const ownerExists = members.some(member => member.userId === board.ownerId);
      if (!ownerExists) {
        // Create a fake member entry for the owner
        allMembers.unshift({
          id: `owner-${board.ownerId}`,
          boardId: boardId,
          userId: board.ownerId,
          role: 'owner',
          createdAt: board.createdAt || new Date(),
          user: board.owner
        });
      }
    }

    return res.json({ members: allMembers });
  } catch (err) {
    console.error("getBoardMembers error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/boards/:boardId/members
 * - body: { userId, role? }
 * - allowed: board owner or admin (admins can't grant the admin role)
 */
export async function addBoardMember(req, res) {
  try {
    const parse = addMemberSchema.safeParse(req.body);
    if (!parse.success)
      return res
        .status(400)
        .json({ message: "Invalid payload", errors: parse.error.format() });

    const { userId, role } = parse.data;
    const boardId = req.params.boardId;
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ message: "Unauthorized" });

    const auth = await authorizeManage({ boardId, actorId, nextRole: role });
    if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });
    const { board } = auth;

    // ensure user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: "User not found" });

    // Check if already a member
    const existingMember = await prisma.boardMember.findFirst({
      where: { boardId, userId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    if (existingMember) {
      return res
        .status(200)
        .json({ member: existingMember, message: "Already a member" });
    }

    // Create new member
    const member = await prisma.boardMember.create({
      data: { boardId, userId, role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    // emit real-time event to board room
    const io = getIo();
    if (io) {
      io.to(`room:board:${boardId}`).emit("member:added", {
        boardId,
        member: {
          id: member.id,
          role: member.role,
          user: member.user,
          userId: member.userId,
        },
        actorId: actorId,
      });
    }

    syncUserBoardRole(member.userId, boardId, member.role);
    await notifyMemberAdded({ boardId, board, actorId, newMember: member });

    return res
      .status(201)
      .json({ member: member, message: "Member added successfully" });
  } catch (err) {
    console.error("addBoardMember error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/boards/:boardId/members/invite
 * Body: { email, role? }
 * Allowed: board owner or admin (admins can't grant the admin role).
 * - If user exists: create BoardMember (or return existing)
 * - If user not found: return 404 (we will implement pending invites later)
 */
export async function inviteBoardMemberByEmail(req, res) {
  try {
    const parsed = inviteMemberSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: "Invalid email" });
    const { email, role } = parsed.data;
    const boardId = req.params.boardId;
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ message: "Unauthorized" });

    const auth = await authorizeManage({ boardId, actorId, nextRole: role });
    if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });
    const { board } = auth;

    // find user by email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      // For now, we return 404 and a clear message.
      // Future: create pending invite record and send email.
      return res.status(404).json({
        message:
          "Email is not registered !",
      });
    }

    // create member (handle unique constraint)
    try {
      const member = await prisma.boardMember.create({
        data: { boardId, userId: user.id, role },
        include: { user: { select: { id: true, email: true, name: true } } },
      });

      const io = getIo();
      if (io) {
        io.to(`room:board:${boardId}`).emit("member:added", {
          boardId,
          member: {
            id: member.id,
            role: member.role,
            user: member.user,
            userId: member.userId,
          },
          actorId,
        });

        // also notify the added user's sockets so their 'myBoards' can update
        io.to(`user:${user.id}`).emit("board:added", {
          boardId,
          board: { id: boardId }, // optionally include title/owner if you fetch it
        });
      }

      // Persistent notification for the invited user + board activity entry.
      await notify({
        userId: user.id,
        type: "invite",
        boardId,
        actorId,
        data: { boardTitle: board.title, role: member.role },
      });
      logActivity({
        boardId,
        actorId,
        type: "member.added",
        meta: { userId: user.id, email: user.email, role: member.role },
      });

      syncUserBoardRole(member.userId, boardId, member.role);
      await notifyMemberAdded({ boardId, board, actorId, newMember: member });

      return res.status(201).json({ member, message: "Added successfully" });
    } catch (e) {
      if (e?.code === "P2002") {
        // already a member
        const existing = await prisma.boardMember.findFirst({
          where: { boardId, userId: user.id },
        });
        return res
          .status(200)
          .json({ member: existing, message: "Already a member" });
      }
      throw e;
    }
  } catch (err) {
    console.error("inviteBoardMemberByEmail error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * DELETE /api/boards/:boardId/members/:userId
 * - allowed: board owner or admin (admins can't remove the owner or admins)
 */
export async function removeBoardMember(req, res) {
  try {
    const boardId = req.params.boardId;
    const targetUserId = req.params.userId;
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ message: "Unauthorized" });

    const targetRole = await getUserBoardRole(boardId, targetUserId);
    const auth = await authorizeManage({ boardId, actorId, targetUserId, targetRole });
    if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });

    const deleted = await prisma.boardMember.deleteMany({
      where: { boardId, userId: targetUserId },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ message: "Member not found" });
    }

    if (deleted.count > 0) {
      const io = getIo();
      if (io) {
        io.to(`room:board:${boardId}`).emit("member:removed", {
          boardId,
          userId: targetUserId,
          actorId,
        });
      }
      // Revoke the removed user's cached role and kick them from the live board.
      syncUserBoardRole(targetUserId, boardId, null);
      return res.status(204).send();
    }
  } catch (err) {
    console.error("removeBoardMember error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * PATCH /api/boards/:boardId/members/:userId  body: { role }
 * - allowed: board owner or admin (admins can't touch the owner or admins)
 * - cannot change the owner's role (ownership is implicit)
 */
export async function updateMemberRole(req, res) {
  try {
    const parsed = updateMemberRoleSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Invalid role" });

    const boardId = req.params.boardId;
    const targetUserId = req.params.userId;
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ message: "Unauthorized" });

    const existing = await prisma.boardMember.findFirst({ where: { boardId, userId: targetUserId } });

    const auth = await authorizeManage({
      boardId,
      actorId,
      targetUserId,
      targetRole: existing?.role,
      nextRole: parsed.data.role,
    });
    if (auth.error) return res.status(auth.error.status).json({ message: auth.error.message });
    const { board } = auth;

    if (targetUserId === board.ownerId)
      return res.status(400).json({ message: "Cannot change the owner's role" });
    if (!existing) return res.status(404).json({ message: "Member not found" });

    const member = await prisma.boardMember.update({
      where: { id: existing.id },
      data: { role: parsed.data.role },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    const io = getIo();
    if (io) {
      io.to(`room:board:${boardId}`).emit("member:updated", {
        boardId,
        member: { id: member.id, role: member.role, user: member.user, userId: member.userId },
        actorId,
      });
    }

    syncUserBoardRole(targetUserId, boardId, member.role);

    logActivity({
      boardId,
      actorId,
      type: "member.role_changed",
      meta: { userId: targetUserId, role: member.role },
    });

    return res.json({ member, message: "Role updated" });
  } catch (err) {
    console.error("updateMemberRole error", err);
    return res.status(500).json({ message: "Server error" });
  }
}
