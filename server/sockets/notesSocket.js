import {
  createNote,
  updateNote,
  deleteNote,
} from "../controllers/notesController.js";

export function registerNotesSocket(io, socket) {
  const ensureJoined = (id) => socket.rooms.has(boardRoom(id));

  // Create note
  socket.on("note:create", async (boardId, payload, ack) => {
    if (!ensureJoined(boardId))
      return ack?.({ ok: false, status: 403, message: "Not joined" });
    try {
      const note = await createNote(boardId, payload);
      io.to(boardRoom(boardId)).emit("note:created", {
        boardId,
        note,
        actorId: socket.user?.id,
      });
      ack?.({ ok: true, note });
    } catch (err) {
      ack?.({ ok: false, message: err.message });
    }
  });

  // Update note (move/edit)
  socket.on("note:update", async (boardId, noteId, patch, ack) => {
    if (!ensureJoined(boardId))
      return ack?.({ ok: false, status: 403, message: "Not joined" });
    try {
      const updated = await updateNote(boardId, noteId, patch);
      if (!updated) {
        ack?.({ ok: false, message: "Note not found" });
        return;
      }
      io.to(boardRoom(boardId)).emit("note:updated", {
        boardId,
        note: updated,
        actorId: socket.user?.id,
      });
      ack?.({ ok: true, note: updated });
    } catch (err) {
      ack?.({ ok: false, message: err.message });
    }
  });

  // Delete note
  socket.on("note:delete", async (boardId, noteId, ack) => {
    if (!ensureJoined(boardId))
      return ack?.({ ok: false, status: 403, message: "Not joined" });
    try {
      const ok = await deleteNote(boardId, noteId);
      if (!ok) {
        ack?.({ ok: false, message: "Note not found" });
        return;
      }
      io.to(boardRoom(boardId)).emit("note:deleted", {
        boardId,
        noteId,
        actorId: socket.user?.id,
      });
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, message: err.message });
    }
  });
}

/** Helper to compute a room name for a board */
function boardRoom(boardId) {
  return `room:board:${boardId}`;
}
