import { PrismaClient } from '@prisma/client';
import { getNotesSnapshot } from '../controllers/notesController.js';

const prisma = new PrismaClient();

export function registerBoardsSocket(io, socket) {
  socket.on('board:join', async (boardId, ack) => {
    try {
      if (!boardId || typeof boardId !== 'string')
        throw new Error('Invalid boardId');

      const userId = socket.user?.id;
      if (!userId) return ack?.({ ok: false, status: 401, message: 'Unauthorized' });

      const board = await prisma.board.findUnique({
        where: { id: boardId },
        select: { id: true, ownerId: true },
      });
      if (!board) return ack?.({ ok: false, status: 404, message: 'Board not found' });

      if (board.ownerId !== userId) {
        const member = await prisma.boardMember.findFirst({
          where: { boardId, userId },
        });
        if (!member) return ack?.({ ok: false, status: 403, message: 'Forbidden' });
      }

      socket.join(boardRoom(boardId));
      const snapshot = await getNotesSnapshot(boardId);
      ack?.({ ok: true, boardId, notes: snapshot });
    } catch (err) {
      console.error('board:join error', err);
      ack?.({ ok: false, message: err.message });
    }
  });

  socket.on('board:leave', (boardId) => {
    if (boardId && typeof boardId === 'string') {
      socket.leave(boardRoom(boardId));
    }
  });
}

function boardRoom(boardId) {
  return `room:board:${boardId}`;
}
