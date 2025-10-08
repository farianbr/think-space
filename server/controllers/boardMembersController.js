import { addMemberSchema } from '../validation/schemas.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/boards/:boardId/members
 * - allowed: board owner OR any board member
 */
export async function getBoardMembers(req, res) {
  try {
    const boardId = req.params.boardId;
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: 'Unauthorized' });

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, ownerId: true },
    });

    if (!board) return res.status(404).json({ message: 'Board not found' });

    // owner can view, or members can view
    if (board.ownerId !== userId) {
      const member = await prisma.boardMember.findFirst({
        where: { boardId, userId },
      });
      if (!member) return res.status(403).json({ message: 'Forbidden' });
    }

    const members = await prisma.boardMember.findMany({
      where: { boardId },
      include: { user: { select: { id: true, email: true, name: true } } },
    });

    return res.json({ members });
  } catch (err) {
    console.error('getBoardMembers error', err);
    return res.status(500).json({ message: 'Server error' });
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
    if (!parse.success) return res.status(400).json({ message: 'Invalid payload', errors: parse.error.format() });

    const { userId, role } = parse.data;
    const boardId = req.params.boardId;
    const actorId = req.user?.id;
    if (!actorId) return res.status(401).json({ message: 'Unauthorized' });

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { id: true, ownerId: true },
    });
    if (!board) return res.status(404).json({ message: 'Board not found' });

    if (board.ownerId !== actorId) {
      return res.status(403).json({ message: 'Only board owner can add members' });
    }

    // ensure user exists
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) return res.status(404).json({ message: 'User not found' });

    try {
      const member = await prisma.boardMember.create({
        data: { boardId, userId, role },
      });
      return res.status(201).json({ member });
    } catch (e) {
      // handle unique constraint: if already member, return 200 with existing member
      if (e?.code === 'P2002') {
        const existing = await prisma.boardMember.findFirst({ where: { boardId, userId } });
        return res.status(200).json({ member: existing, message: 'Already a member' });
      }
      throw e;
    }
  } catch (err) {
    console.error('addBoardMember error', err);
    return res.status(500).json({ message: 'Server error' });
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
    if (!actorId) return res.status(401).json({ message: 'Unauthorized' });

    const board = await prisma.board.findUnique({ where: { id: boardId }, select: { id: true, ownerId: true } });
    if (!board) return res.status(404).json({ message: 'Board not found' });

    if (board.ownerId !== actorId) {
      return res.status(403).json({ message: 'Only board owner can remove members' });
    }

    const deleted = await prisma.boardMember.deleteMany({
      where: { boardId, userId: targetUserId },
    });

    if (deleted.count === 0) {
      return res.status(404).json({ message: 'Member not found' });
    }

    return res.status(204).send();
  } catch (err) {
    console.error('removeBoardMember error', err);
    return res.status(500).json({ message: 'Server error' });
  }
}
