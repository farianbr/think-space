// controllers/notesController.js
import { prisma } from "../prismaClient.js";

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
  // Optionally validate payload (we'll add Zod later)
  const text = typeof payload?.text === "string" ? payload.text : "";
  const x = Number.isFinite(payload?.x) ? Math.round(payload.x) : 100;
  const y = Number.isFinite(payload?.y) ? Math.round(payload.y) : 100;
  const color = typeof payload?.color === "string" ? payload.color : "#fde047";
  const width = Number.isFinite(payload?.width) ? Math.max(100, Math.round(payload.width)) : 180;
  const height = Number.isFinite(payload?.height) ? Math.max(60, Math.round(payload.height)) : 120;

  // Make sure board exists; if not, we could auto-create in dev
  await prisma.board.upsert({
    where: { id: boardId },
    update: {},
    create: { id: boardId, title: "Untitled Board" },
  });

  const note = await prisma.note.create({
    data: { boardId, text, x, y, color, width, height },
  });
  return note;
}

export async function updateNote(boardId, noteId, patch) {
  // Allowed constrain fields
  const data = {};
  if (typeof patch?.text === "string") data.text = patch.text;
  if (Number.isFinite(patch?.x)) data.x = Math.round(patch.x);
  if (Number.isFinite(patch?.y)) data.y = Math.round(patch.y);
  if (Number.isFinite(patch?.width)) data.width = Math.max(100, Math.round(patch.width));
  if (Number.isFinite(patch?.height)) data.height = Math.max(60, Math.round(patch.height));
  if (typeof patch?.color === "string") data.color = patch.color;

  if (Object.keys(data).length === 0) {
    // nothing to update
    const existing = await prisma.note.findUnique({ where: { id: noteId } });
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
