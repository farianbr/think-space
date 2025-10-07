// sockets/notesSocket.mjs
import {
  createNote,
  updateNote,
  deleteNote,
  getNotesSnapshot,
} from "../controllers/notesController.js";

/**
 * Register all Socket.IO note-related handlers on a given socket.
 * Called inside io.on("connection").
 */
export function registerNotesSocket(io, socket) {
  // Clients should join a board-specific room before sending/receiving note events.
  socket.on("board:join", async (boardId, ack) => {
    try {
      if (!boardId || typeof boardId !== "string")
        throw new Error("Invalid boardId");
      socket.join(boardRoom(boardId));
      // Optionally send snapshot via socket (we also have HTTP route)
      const snapshot = await getNotesSnapshot(boardId);
      ack?.({ ok: true, boardId, notes: snapshot });
    } catch (err) {
      ack?.({ ok: false, message: err.message });
    }
  });

  socket.on("board:leave", (boardId) => {
    if (boardId && typeof boardId === "string") {
      socket.leave(boardRoom(boardId));
    }
  });

  // Create note
  socket.on("note:create", async (boardId, payload, ack) => {
    try {
      const note = await createNote(boardId, payload);
      io.to(boardRoom(boardId)).emit("note:created", { boardId, note });
      ack?.({ ok: true, note });
    } catch (err) {
      ack?.({ ok: false, message: err.message });
    }
  });

  // Update note (move/edit)
  socket.on("note:update", async (boardId, noteId, patch, ack) => {
    try {
      const updated = await updateNote(boardId, noteId, patch);
      if (!updated) {
        ack?.({ ok: false, message: "Note not found" });
        return;
      }
      io.to(boardRoom(boardId)).emit("note:updated", {
        boardId,
        note: updated,
      });
      ack?.({ ok: true, note: updated });
    } catch (err) {
      ack?.({ ok: false, message: err.message });
    }
  });

  // Delete note
  socket.on("note:delete", async (boardId, noteId, ack) => {
    try {
      const ok = await deleteNote(boardId, noteId);
      if (!ok) {
        ack?.({ ok: false, message: "Note not found" });
        return;
      }
      io.to(boardRoom(boardId)).emit("note:deleted", { boardId, noteId });
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
