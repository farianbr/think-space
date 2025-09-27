import { v4 as uuid } from "uuid";

const boards = new Map();

function ensureBoard(boardId) {
  if (!boards.has(boardId)) {
    boards.set(boardId, new Map());
  }
  return boards.get(boardId);
}

export function getNotesSnapshot(boardId) {
  const board = ensureBoard(boardId);
  return Array.from(board.values());
}

export function createNote(boardId, payload) {
  const text = typeof payload?.text === "string" ? payload.text : "";
  const x = Number.isFinite(payload?.x) ? payload.x : 100;
  const y = Number.isFinite(payload?.y) ? payload.y : 100;
  const color = typeof payload?.color === "string" ? payload.color : "yellow";

  const note = {
    id: uuid(),
    text,
    x,
    y,
    color,
    ts: Date.now(),
  };

  const board = ensureBoard(boardId);
  board.set(note.id, note);
  return note;
}

export function updateNote(boardId, noteId, patch) {
  const board = ensureBoard(boardId);
  const existing = board.get(noteId);
  if (!existing) return null;

  // Only allow known fields to be patched for safety
  const next = {
    ...existing,
    ...(typeof patch?.text === "string" ? { text: patch.text } : null),
    ...(Number.isFinite(patch?.x) ? { x: patch.x } : null),
    ...(Number.isFinite(patch?.y) ? { y: patch.y } : null),
    ...(typeof patch?.color === "string" ? { color: patch.color } : null),
    ts: Date.now(),
  };

  board.set(noteId, next);
  return next;
}

export function deleteNote(boardId, noteId) {
  const board = ensureBoard(boardId);
  return board.delete(noteId);
}
