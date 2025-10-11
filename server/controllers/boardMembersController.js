import { PrismaClient } from "@prisma/client";

import { addMemberSchema } from "../validation/schemas.js";
import { getIo } from "../lib/io.js";

const prisma = new PrismaClient();
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
      console.log("Already a member");
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
    const { email, role = "member" } = req.body ?? {};
    const boardId = req.params.boardId;
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ message: "Unauthorized" });
    if (!email || typeof email !== "string")
      return res.status(400).json({ message: "Invalid email" });

    // owner check
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, ownerId: true },
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
          "No user with that email. Consider inviting them to sign up first.",
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
      }

      // also notify the added user's sockets so their 'myBoards' can update
      io.to(`user:${user.id}`).emit("board:added", {
        boardId,
        board: { id: boardId }, // optionally include title/owner if you fetch it
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
