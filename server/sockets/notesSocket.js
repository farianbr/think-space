import {
  createNote,
  updateNote,
  deleteNote,
  getNoteText,
} from "../controllers/notesController.js";
import { logActivity } from "../lib/activity.js";
import { canEdit } from "../lib/permissions.js";
import { notifyMentions } from "../lib/mentions.js";

export function registerNotesSocket(io, socket) {
  const ensureJoined = (id) => socket.rooms.has(boardRoom(id));
  const roleFor = (id) => socket.data.boardRoles?.[id];

  // Reject when the caller's cached role on this board can't edit notes.
  // Returns true if the action was rejected (ack already sent).
  const denyIfReadOnly = (boardId, ack) => {
    if (!ensureJoined(boardId)) {
      ack?.({ ok: false, status: 403, message: "Not joined" });
      return true;
    }
    if (!canEdit(roleFor(boardId))) {
      ack?.({ ok: false, status: 403, message: "You don't have edit access" });
      return true;
    }
    return false;
  };

  // Create note
  socket.on("note:create", async (boardId, payload, ack) => {
    if (denyIfReadOnly(boardId, ack)) return;
    try {
      const note = await createNote(boardId, payload);
      io.to(boardRoom(boardId)).emit("note:created", {
        boardId,
        note,
        actorId: socket.user?.id,
        socketId: socket.id,
      });
      logActivity({ boardId, actorId: socket.user?.id, type: "note.created" });
      notifyMentions({ boardId, note, actorId: socket.user?.id, previousText: "" });
      ack?.({ ok: true, note });
    } catch (err) {
      ack?.({ ok: false, message: err.message });
    }
  });

  // Update note (move/edit)
  socket.on("note:update", async (boardId, noteId, patch, ack) => {
    if (denyIfReadOnly(boardId, ack)) return;
    try {
      // Capture prior text so mention notifications only fire for newly added
      // @mentions, not on every move/resize of an already-mentioning note.
      const previousText =
        typeof patch?.text === "string"
          ? (await getNoteText(noteId)) ?? ""
          : null;

      const updated = await updateNote(boardId, noteId, patch);
      if (!updated) {
        ack?.({ ok: false, message: "Note not found" });
        return;
      }
      io.to(boardRoom(boardId)).emit("note:updated", {
        boardId,
        note: updated,
        actorId: socket.user?.id,
        socketId: socket.id, // can be used client-side to ignore self-updates
      });
      if (previousText !== null) {
        notifyMentions({ boardId, note: updated, actorId: socket.user?.id, previousText });
      }
      ack?.({ ok: true, note: updated });
    } catch (err) {
      ack?.({ ok: false, message: err.message });
    }
  });

  // Delete note
  socket.on("note:delete", async (boardId, noteId, ack) => {
    if (denyIfReadOnly(boardId, ack)) return;
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
        socketId: socket.id,
      });
      logActivity({ boardId, actorId: socket.user?.id, type: "note.deleted" });
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
