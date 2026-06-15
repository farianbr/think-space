import { prisma } from "../prismaClient.js";

import {
  addMemberSchema,
  inviteMemberSchema,
  updateMemberRoleSchema,
} from "../validation/schemas.js";
import { getIo } from "../lib/io.js";
import { notify } from "../lib/notify.js";
import { logActivity } from "../lib/activity.js";
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
 * - allowed: only board owner
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

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, ownerId: true },
    });
    if (!board) return res.status(404).json({ message: "Board not found" });

    if (board.ownerId !== actorId) {
      return res
        .status(403)
        .json({ message: "Only board owner can add members" });
    }

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
 * Only board owner can call this.
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

    // owner check
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, ownerId: true, title: true },
    });
    if (!board) return res.status(404).json({ message: "Board not found" });
    if (board.ownerId !== actorId)
      return res
        .status(403)
        .json({ message: "Only owner can invite by email" });

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
 * - allowed: only board owner
 */
export async function removeBoardMember(req, res) {
  try {
    const boardId = req.params.boardId;
    const targetUserId = req.params.userId;
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ message: "Unauthorized" });

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, ownerId: true },
    });
    if (!board) return res.status(404).json({ message: "Board not found" });

    if (board.ownerId !== actorId) {
      return res
        .status(403)
        .json({ message: "Only board owner can remove members" });
    }

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
      return res.status(204).send();
    }
  } catch (err) {
    console.error("removeBoardMember error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * PATCH /api/boards/:boardId/members/:userId  body: { role }
 * - allowed: only board owner
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

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, ownerId: true },
    });
    if (!board) return res.status(404).json({ message: "Board not found" });
    if (board.ownerId !== actorId)
      return res.status(403).json({ message: "Only board owner can change roles" });
    if (targetUserId === board.ownerId)
      return res.status(400).json({ message: "Cannot change the owner's role" });

    const existing = await prisma.boardMember.findFirst({ where: { boardId, userId: targetUserId } });
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
