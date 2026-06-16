import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Activity as ActivityIcon, ChevronDown } from "../lib/icons";

import { useWorkspaceActivity } from "../hooks/activity";
import { Avatar, DropdownMenu, Button, EmptyState, Skeleton, Card } from "../components/ui";
import { describeActivity } from "../lib/activityText";
import { timeAgo } from "../lib/format";

/** Bucket a timestamp into Today / Yesterday / an absolute date label. */
function dayLabel(input) {
  const d = new Date(input);
  const now = new Date();
  const startOf = (x) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const days = Math.round((startOf(now) - startOf(d)) / 86400000);
  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" });
}

function ActivityRow({ activity }) {
  const { icon: Icon, text } = describeActivity(activity);
  return (
    <li className="flex items-start gap-3 px-4 py-3">
      <Avatar user={activity.actor} src={activity.actor?.avatarUrl} size="sm" className="mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-ink-soft">
          {text}
          {activity.board && (
            <>
              {" "}
              <span className="text-muted">in</span>{" "}
              <Link
                to={`/board/${activity.board.id}`}
                className="font-medium text-ink underline-offset-2 hover:underline"
              >
                {activity.board.title}
              </Link>
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2 pt-0.5">
        <Icon className="size-3.5 text-faint" strokeWidth={2} aria-hidden />
        <time className="text-xs text-faint" dateTime={activity.createdAt}>
          {timeAgo(activity.createdAt)}
        </time>
      </div>
    </li>
  );
}

export default function ActivityPage() {
  const { data: activities, isLoading } = useWorkspaceActivity(100);
  const [boardId, setBoardId] = useState("all");

  // Distinct boards present in the feed, for the filter dropdown.
  const boards = useMemo(() => {
    const map = new Map();
    for (const a of activities || []) {
      if (a.board && !map.has(a.board.id)) map.set(a.board.id, a.board);
    }
    return [...map.values()];
  }, [activities]);

  const filtered = useMemo(
    () => (boardId === "all" ? activities || [] : (activities || []).filter((a) => a.board?.id === boardId)),
    [activities, boardId]
  );

  // Group consecutive activities under day headers (feed is already desc by time).
  const groups = useMemo(() => {
    const out = [];
    let current = null;
    for (const a of filtered) {
      const label = dayLabel(a.createdAt);
      if (!current || current.label !== label) {
        current = { label, items: [] };
        out.push(current);
      }
      current.items.push(a);
    }
    return out;
  }, [filtered]);

  const activeBoard = boards.find((b) => b.id === boardId);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Activity</h1>
          <p className="mt-1 text-sm text-muted">Everything happening across your boards.</p>
        </div>
        {boards.length > 0 && (
          <DropdownMenu
            align="end"
            trigger={
              <Button variant="secondary" size="sm" iconRight={ChevronDown}>
                {activeBoard ? activeBoard.title : "All boards"}
              </Button>
            }
          >
            <DropdownMenu.Item onSelect={() => setBoardId("all")}>All boards</DropdownMenu.Item>
            <DropdownMenu.Separator />
            {boards.map((b) => (
              <DropdownMenu.Item key={b.id} onSelect={() => setBoardId(b.id)}>
                {b.title}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-14" />
          ))}
        </div>
      ) : groups.length === 0 ? (
        <EmptyState
          icon={ActivityIcon}
          title="No activity yet"
          description="As you and your collaborators work on boards, a running history shows up here."
        />
      ) : (
        <div className="space-y-6">
          {groups.map((g) => (
            <section key={g.label}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-faint">
                {g.label}
              </h2>
              <Card className="overflow-hidden p-0">
                <ul className="divide-y divide-hairline">
                  {g.items.map((a) => (
                    <ActivityRow key={a.id} activity={a} />
                  ))}
                </ul>
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
