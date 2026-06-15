import { useState } from "react";
import { Activity as ActivityIcon, Users, Mic, X, Circle } from "lucide-react";
import { IconButton } from "../ui";
import ActivityFeed from "../activity/ActivityFeed";
import ActiveUsers from "../ActiveUsers";
import MembersList from "../MembersList";
import VoiceRoomPanel from "./VoiceRoomPanel";
import { useBoardActivity } from "../../hooks/activity";
import { cn } from "../../lib/cn";

const TABS = [
  { id: "activity", label: "Activity", icon: ActivityIcon },
  { id: "members", label: "Members", icon: Users },
  { id: "voice", label: "Voice", icon: Mic },
];

/**
 * Right-hand board panel: Activity / Members / Voice. Rendered as a slide-over
 * on top of the canvas; the parent controls open/close.
 */
export default function BoardPanel({ boardId, board, online, initialTab = "activity", onClose }) {
  const [tab, setTab] = useState(initialTab);
  const { data: activities, isLoading } = useBoardActivity(boardId);

  return (
    <div className="flex h-full w-full flex-col bg-surface sm:w-96">
      <div className="flex items-center justify-between border-b border-hairline px-4 py-3">
        <div className="flex items-center gap-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-sunken text-ink" : "text-muted hover:text-ink"
                )}
              >
                <Icon className="size-4" strokeWidth={2} aria-hidden />
                {t.label}
              </button>
            );
          })}
        </div>
        <IconButton icon={X} label="Close panel" size="sm" onClick={onClose} />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {tab === "activity" && (
          <div className="p-4">
            <ActivityFeed activities={activities} isLoading={isLoading} compact />
          </div>
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

        {tab === "voice" && <VoiceRoomPanel online={online} />}
      </div>
    </div>
  );
}
