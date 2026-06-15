import { prisma } from "../prismaClient.js";

const MAX_COMMENT = 2000;
const authorSelect = { id: true, name: true, email: true, avatarUrl: true };

// Reactions are limited to a small, safe set of emoji.
export const ALLOWED_EMOJI = ["👍", "❤️", "🎉", "🔥", "👀", "✅"];

/** Comments on a note, oldest first, with author info. */
export async function listComments(boardId, noteId) {
  return prisma.comment.findMany({
    where: { boardId, noteId },
    orderBy: { createdAt: "asc" },
    include: { author: { select: authorSelect } },
  });
}

/** All reactions on a note as lightweight { emoji, userId } rows. */
export async function listReactions(noteId) {
  return prisma.reaction.findMany({
    where: { noteId },
    select: { emoji: true, userId: true },
  });
}

export async function getComment(commentId) {
  return prisma.comment.findUnique({ where: { id: commentId } });
}

/** Create a comment after verifying the note belongs to the board. */
export async function createComment({ boardId, noteId, authorId, text }) {
  const clean = String(text || "").trim().slice(0, MAX_COMMENT);
  if (!clean) return null;

  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { boardId: true },
  });
  if (!note || note.boardId !== boardId) return null;

  return prisma.comment.create({
    data: { boardId, noteId, authorId, text: clean },
    include: { author: { select: authorSelect } },
  });
}

export async function deleteComment(commentId) {
  await prisma.comment.delete({ where: { id: commentId } });
}

/**
 * Toggle a user's emoji reaction on a note. Returns the note's full reaction
 * list afterwards, or null if the note/board/emoji is invalid.
 */
export async function toggleReaction({ boardId, noteId, userId, emoji }) {
  if (!ALLOWED_EMOJI.includes(emoji)) return null;

  const note = await prisma.note.findUnique({
    where: { id: noteId },
    select: { boardId: true },
  });
  if (!note || note.boardId !== boardId) return null;

  const existing = await prisma.reaction.findUnique({
    where: { noteId_userId_emoji: { noteId, userId, emoji } },
  });
  if (existing) {
    await prisma.reaction.delete({ where: { id: existing.id } });
  } else {
    await prisma.reaction.create({ data: { noteId, userId, emoji } });
  }

  return listReactions(noteId);
}
