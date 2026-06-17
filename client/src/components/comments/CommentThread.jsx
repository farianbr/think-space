import { useEffect, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { Send, Trash2, MessageSquare } from "../../lib/icons";

import { socket } from "../../lib/socket";
import { useAuth } from "../../contexts/authContext";
import { Avatar, IconButton, EmptyState, Spinner } from "../ui";
import { displayName, timeAgo } from "../../lib/format";
import { cn } from "../../lib/cn";

// Must match server/controllers/commentsController.js ALLOWED_EMOJI.
const REACTION_EMOJI = ["👍", "❤️", "🎉", "🔥", "👀", "✅"];

/**
 * Comments + reactions for a single note. Loads via the `comment:list` socket
 * event and stays live through `comment:created`/`comment:deleted`/
 * `reaction:updated` broadcasts. Posting is disabled for read-only roles.
 */
export default function CommentThread({ boardId, note, canComment, canManage }) {
  const { user } = useAuth();
  const noteId = note?.id;
  const [comments, setComments] = useState([]);
  const [reactions, setReactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const listEndRef = useRef(null);

  // (Re)load whenever the selected note changes.
  useEffect(() => {
    if (!boardId || !noteId) return;
    setLoading(true);
    socket.emit("comment:list", boardId, noteId, (res) => {
      if (res?.ok) {
        setComments(res.comments || []);
        setReactions(res.reactions || []);
      }
      setLoading(false);
    });
  }, [boardId, noteId]);

  // Live updates scoped to this note.
  useEffect(() => {
    if (!noteId) return;
    const onCreated = (p) => {
      if (p?.noteId !== noteId) return;
      setComments((prev) => (prev.some((c) => c.id === p.comment.id) ? prev : [...prev, p.comment]));
    };
    const onDeleted = (p) => {
      if (p?.noteId !== noteId) return;
      setComments((prev) => prev.filter((c) => c.id !== p.commentId));
    };
    const onReaction = (p) => {
      if (p?.noteId !== noteId) return;
      setReactions(p.reactions || []);
    };
    socket.on("comment:created", onCreated);
    socket.on("comment:deleted", onDeleted);
    socket.on("reaction:updated", onReaction);
    return () => {
      socket.off("comment:created", onCreated);
      socket.off("comment:deleted", onDeleted);
      socket.off("reaction:updated", onReaction);
    };
  }, [noteId]);

  useEffect(() => {
    listEndRef.current?.scrollIntoView({ block: "nearest" });
  }, [comments.length]);

  const submit = (e) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sending) return;
    setSending(true);
    socket.emit("comment:create", boardId, noteId, value, (res) => {
      setSending(false);
      if (res?.ok) setText("");
      else toast.error(res?.message || "Couldn't post comment");
    });
  };

  const removeComment = (commentId) => {
    socket.emit("comment:delete", boardId, commentId, (res) => {
      if (!res?.ok) toast.error(res?.message || "Couldn't delete comment");
    });
  };

  const toggleReaction = (emoji) => {
    if (!canComment) return;
    socket.emit("reaction:toggle", boardId, noteId, emoji, (res) => {
      if (!res?.ok) toast.error(res?.message || "Couldn't react");
    });
  };

  if (!noteId) {
    return (
      <EmptyState
        icon={MessageSquare}
        size="sm"
        title="No note selected"
        description="Select a note on the board to view its comments."
      />
    );
  }

  const counts = REACTION_EMOJI.map((emoji) => {
    const users = reactions.filter((r) => r.emoji === emoji);
    return { emoji, count: users.length, mine: users.some((r) => r.userId === user?.id) };
  });

  return (
    <div className="flex h-full flex-col">
      {/* Note preview */}
      <div className="border-b border-hairline p-4">
        <p className="line-clamp-3 whitespace-pre-wrap rounded-lg bg-sunken px-3 py-2 text-sm text-ink">
          {note.text?.trim() || <span className="text-faint">Empty note</span>}
        </p>
        {/* Reactions */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {counts.map(({ emoji, count, mine }) => (
            <button
              key={emoji}
              onClick={() => toggleReaction(emoji)}
              disabled={!canComment}
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                mine
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-hairline text-muted hover:bg-sunken"
              )}
            >
              <span>{emoji}</span>
              {count > 0 && <span className="font-medium">{count}</span>}
            </button>
          ))}
        </div>
      </div>

      {/* Thread */}
      <div className="min-h-0 flex-1 overflow-y-auto p-4">
        {loading ? (
          <div className="flex justify-center py-8">
            <Spinner />
          </div>
        ) : comments.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            size="sm"
            title="No comments yet"
            description={canComment ? "Start the conversation." : "Comments will appear here."}
          />
        ) : (
          <div className="space-y-4">
            {comments.map((c) => {
              const canDelete = canManage || c.author?.id === user?.id;
              return (
                <div key={c.id} className="group flex gap-2.5">
                  <Avatar user={c.author} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-sm font-medium text-ink">
                        {displayName(c.author)}
                      </span>
                      <span className="text-[11px] text-faint">{timeAgo(c.createdAt)}</span>
                      {canDelete && (
                        <IconButton
                          icon={Trash2}
                          label="Delete comment"
                          size="sm"
                          className="ml-auto opacity-0 group-hover:opacity-100"
                          onClick={() => removeComment(c.id)}
                        />
                      )}
                    </div>
                    <p className="whitespace-pre-wrap break-words text-sm text-ink-soft">{c.text}</p>
                  </div>
                </div>
              );
            })}
            <div ref={listEndRef} />
          </div>
        )}
      </div>

      {/* Composer */}
      {canComment ? (
        <form onSubmit={submit} className="flex items-end gap-2 border-t border-hairline p-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit(e);
            }}
            rows={1}
            placeholder="Add a comment…"
            className="max-h-28 min-h-[40px] flex-1 resize-none rounded-lg border border-line bg-surface px-3 py-2 text-sm text-ink placeholder:text-faint focus:outline-none focus:ring-2 focus:ring-accent/40"
          />
          <IconButton icon={Send} label="Send" type="submit" variant="ink" disabled={!text.trim() || sending} />
        </form>
      ) : (
        <p className="border-t border-hairline p-3 text-center text-xs text-faint">
          You have view-only access and can't comment.
        </p>
      )}
    </div>
  );
}
