import { useEffect, useState } from "react";
import { Activity as ActivityIcon, Users, Mic, MessageSquare, X, Circle } from "../../lib/icons";
import { IconButton, Tooltip } from "../ui";
import ActivityFeed from "../activity/ActivityFeed";
import ActiveUsers from "../ActiveUsers";
import MembersList from "../MembersList";
import VoiceRoomPanel from "./VoiceRoomPanel";
import CommentThread from "../comments/CommentThread";
import { useBoardActivity } from "../../hooks/activity";
import { cn } from "../../lib/cn";

const TABS = [
  { id: "activity", label: "Activity", icon: ActivityIcon },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "members", label: "Members", icon: Users },
  { id: "voice", label: "Voice", icon: Mic },
];

/**
 * Right-hand board panel: Activity / Comments / Members / Voice. Rendered as a
 * slide-over on top of the canvas; the parent controls open/close.
 */
export default function BoardPanel({
  boardId,
  board,
  online,
  initialTab = "activity",
  commentNote,
  canComment,
  canManage,
  onClose,
}) {
  const [tab, setTab] = useState(initialTab);
  const { data: activities, isLoading } = useBoardActivity(boardId);

  // Follow the parent when it opens a specific tab (e.g. a note's comments).
  useEffect(() => setTab(initialTab), [initialTab]);

  return (
    <div className="flex h-full w-full flex-col bg-surface sm:w-96">
      <div className="flex items-center justify-between gap-2 border-b border-hairline px-4 py-3">
        <div className="flex min-w-0 items-center gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            const button = (
              <button
                onClick={() => setTab(t.id)}
                aria-label={t.label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-sunken text-ink" : "text-muted hover:text-ink"
                )}
              >
                <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
                <span className={cn(!active && "sr-only")}>{t.label}</span>
              </button>
            );
            // Active tab shows its label inline; collapsed tabs get a tooltip.
            return active ? (
              <span key={t.id} className="inline-flex">
                {button}
              </span>
            ) : (
              <Tooltip key={t.id} label={t.label} side="bottom">
                {button}
              </Tooltip>
            );
          })}
        </div>
        <IconButton icon={X} label="Close panel" size="sm" onClick={onClose} className="shrink-0" />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "activity" && (
          <div className="p-4">
            <ActivityFeed activities={activities} isLoading={isLoading} compact />
          </div>
        )}

        {tab === "comments" && (
          <CommentThread
            boardId={boardId}
            note={commentNote}
            canComment={canComment}
            canManage={canManage}
          />
        )}

        {tab === "members" && (
          <div className="space-y-6 p-4">
            <div>
              <h3 className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
                <Circle className="size-2 fill-positive text-positive" /> Active now
              </h3>
              <ActiveUsers activeList={online} />
            </div>
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-faint">
                All members
              </h3>
              <MembersList boardId={boardId} boardOwnerId={board?.ownerId} />
            </div>
          </div>
        )}

        {tab === "voice" && <VoiceRoomPanel boardId={boardId} />}
      </div>
    </div>
  );
}
