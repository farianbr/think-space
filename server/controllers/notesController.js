// controllers/notesController.js
import { prisma } from "../prismaClient.js";

const MAX_TEXT_LENGTH = 5000;
const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function sanitizeText(text) {
  return text.slice(0, MAX_TEXT_LENGTH);
}

function isValidColor(color) {
  return typeof color === "string" && HEX_COLOR.test(color);
}

export async function getNotesSnapshot(boardId) {
  // Ensure board exists (important for clean 404s vs empty list)
  const board = await prisma.board.findUnique({ where: { id: boardId } });
  if (!board) return []; // or throw new Error("Board not found")
  const notes = await prisma.note.findMany({
    where: { boardId },
    orderBy: { createdAt: "asc" },
  });
  return notes;
}

export async function createNote(boardId, payload) {
  const text = typeof payload?.text === "string" ? sanitizeText(payload.text) : "";
  const x = Number.isFinite(payload?.x) ? Math.round(payload.x) : 100;
  const y = Number.isFinite(payload?.y) ? Math.round(payload.y) : 100;
  const color = isValidColor(payload?.color) ? payload.color : "#fde047";
  const width = Number.isFinite(payload?.width) ? Math.max(100, Math.round(payload.width)) : 180;
  const height = Number.isFinite(payload?.height) ? Math.max(60, Math.round(payload.height)) : 120;

  // The caller (socket handler) only allows note creation after a successful
  // board:join, which 404s on a missing board — so the board is guaranteed to
  // exist here. Verify rather than upsert to avoid silently creating boards.
  const board = await prisma.board.findUnique({
    where: { id: boardId },
    select: { id: true },
  });
  if (!board) throw new Error("Board not found");

  const note = await prisma.note.create({
    data: { boardId, text, x, y, color, width, height },
  });
  return note;
}

export async function updateNote(boardId, noteId, patch) {
  // Ensure the note exists AND belongs to the board the caller is acting on.
  // Without this, a user joined to board A could mutate notes on any other
  // board by passing a foreign noteId (IDOR).
  const existing = await prisma.note.findUnique({ where: { id: noteId } });
  if (!existing || existing.boardId !== boardId) return null;

  // Allowed / constrained fields
  const data = {};
  if (typeof patch?.text === "string") data.text = sanitizeText(patch.text);
  if (Number.isFinite(patch?.x)) data.x = Math.round(patch.x);
  if (Number.isFinite(patch?.y)) data.y = Math.round(patch.y);
  if (Number.isFinite(patch?.width)) data.width = Math.max(100, Math.round(patch.width));
  if (Number.isFinite(patch?.height)) data.height = Math.max(60, Math.round(patch.height));
  if (isValidColor(patch?.color)) data.color = patch.color;

  if (Object.keys(data).length === 0) {
    // nothing valid to update
    return existing;
  }

  const updated = await prisma.note.update({
    where: { id: noteId },
    data,
  });
  return updated;
}

export async function deleteNote(boardId, noteId) {
  // Optional: ensure note belongs to boardId
  const note = await prisma.note.findUnique({ where: { id: noteId } });
  if (!note || note.boardId !== boardId) return false;

  await prisma.note.delete({ where: { id: noteId } });
  return true;
}
