import {
  listComments,
  listReactions,
  getComment,
  createComment,
  deleteComment,
  toggleReaction,
} from "../controllers/commentsController.js";
import { canComment, canManageMembers } from "../lib/permissions.js";
import { notifyMentions } from "../lib/mentions.js";

/**
 * Realtime comments & reactions on notes. All events require the caller to have
 * joined the board room (which also seeds their cached role). Posting requires
 * commenter+ access; reading is open to any member.
 */
export function registerCommentsSocket(io, socket) {
  const room = (id) => `room:board:${id}`;
  const roleFor = (id) => socket.data.boardRoles?.[id];
  const joined = (id) => socket.rooms.has(room(id));

  socket.on("comment:list", async (boardId, noteId, ack) => {
    if (!joined(boardId)) return ack?.({ ok: false, status: 403, message: "Not joined" });
    try {
      const [comments, reactions] = await Promise.all([
        listComments(boardId, noteId),
        listReactions(noteId),
      ]);
      ack?.({ ok: true, comments, reactions });
    } catch (err) {
      ack?.({ ok: false, message: err.message });
    }
  });

  socket.on("comment:create", async (boardId, noteId, text, ack) => {
    if (!joined(boardId)) return ack?.({ ok: false, status: 403, message: "Not joined" });
    if (!canComment(roleFor(boardId)))
      return ack?.({ ok: false, status: 403, message: "You don't have comment access" });
    try {
      const comment = await createComment({
        boardId,
        noteId,
        authorId: socket.user?.id,
        text,
      });
      if (!comment) return ack?.({ ok: false, message: "Could not add comment" });

      io.to(room(boardId)).emit("comment:created", { boardId, noteId, comment });
      // A comment can @mention people too.
      notifyMentions({
        boardId,
        note: { id: noteId, text: comment.text },
        actorId: socket.user?.id,
        previousText: "",
      });
      ack?.({ ok: true, comment });
    } catch (err) {
      ack?.({ ok: false, message: err.message });
    }
  });

  socket.on("comment:delete", async (boardId, commentId, ack) => {
    if (!joined(boardId)) return ack?.({ ok: false, status: 403, message: "Not joined" });
    try {
      const existing = await getComment(commentId);
      if (!existing || existing.boardId !== boardId)
        return ack?.({ ok: false, message: "Comment not found" });

      // Authors can delete their own; admins/owners can delete any.
      const isAuthor = existing.authorId && existing.authorId === socket.user?.id;
      if (!isAuthor && !canManageMembers(roleFor(boardId)))
        return ack?.({ ok: false, status: 403, message: "Not allowed" });

      await deleteComment(commentId);
      io.to(room(boardId)).emit("comment:deleted", {
        boardId,
        noteId: existing.noteId,
        commentId,
      });
      ack?.({ ok: true });
    } catch (err) {
      ack?.({ ok: false, message: err.message });
    }
  });

  socket.on("reaction:toggle", async (boardId, noteId, emoji, ack) => {
    if (!joined(boardId)) return ack?.({ ok: false, status: 403, message: "Not joined" });
    if (!canComment(roleFor(boardId)))
      return ack?.({ ok: false, status: 403, message: "You don't have access to react" });
    try {
      const reactions = await toggleReaction({
        boardId,
        noteId,
        userId: socket.user?.id,
        emoji,
      });
      if (!reactions) return ack?.({ ok: false, message: "Could not react" });

      io.to(room(boardId)).emit("reaction:updated", { boardId, noteId, reactions });
      ack?.({ ok: true, reactions });
    } catch (err) {
      ack?.({ ok: false, message: err.message });
    }
  });
}
