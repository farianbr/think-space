import { prisma } from "../prismaClient.js";

/**
 * Returns true if the user is the board owner or a member of the board.
 * Centralizes the owner-or-member authorization check used across
 * REST controllers and socket handlers.
 */
export async function userCanAccessBoard(boardId, userId) {
  if (!boardId || !userId) return false;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { ownerId: true },
  });
  if (!board) return false;
  if (board.ownerId === userId) return true;

  const member = await prisma.boardMember.findFirst({
    where: { boardId, userId },
    select: { id: true },
  });
  return !!member;
}
