import { prisma } from "../prismaClient.js";

/**
 * Resolve the requesting user's role on a board.
 * Returns "owner" for the board owner, the stored BoardMember role for members,
 * or null when the user has no access at all. Centralizes the lookup used by
 * REST controllers and socket handlers for authorization.
 */
export async function getUserBoardRole(boardId, userId) {
  if (!boardId || !userId) return null;

  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { ownerId: true },
  });
  if (!board) return null;
  if (board.ownerId === userId) return "owner";

  const member = await prisma.boardMember.findFirst({
    where: { boardId, userId },
    select: { role: true },
  });
  return member?.role ?? null;
}

/**
 * Returns true if the user is the board owner or a member of the board.
 * Thin wrapper over getUserBoardRole kept for existing call sites.
 */
export async function userCanAccessBoard(boardId, userId) {
  return (await getUserBoardRole(boardId, userId)) !== null;
}
