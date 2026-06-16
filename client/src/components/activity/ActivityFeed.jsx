import { Link } from "react-router-dom";
import { Activity as ActivityIcon } from "../../lib/icons";
import { describeActivity } from "../../lib/activityText";
import { timeAgo } from "../../lib/format";
import { Avatar, EmptyState, Skeleton } from "../ui";

/**
 * Timeline of activity rows. `showBoard` adds the board name (workspace feed);
 * omit it inside a single board's panel.
 */
export default function ActivityFeed({ activities, isLoading, showBoard = false, compact = false }) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="size-7" rounded="rounded-full" />
            <div className="flex-1 space-y-2 py-0.5">
              <Skeleton className="h-3 w-3/4" />
              <Skeleton className="h-2.5 w-1/4" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!activities || activities.length === 0) {
    return (
      <EmptyState
        icon={ActivityIcon}
        size="sm"
        title="No activity yet"
        description="Edits, invites and new notes will appear here."
      />
    );
  }

  return (
    <ol className="relative space-y-1">
      {activities.map((a) => {
        const { icon: Icon, text } = describeActivity(a);
        return (
          <li key={a.id} className="flex items-start gap-3 rounded-lg px-1 py-1.5">
            <span className="relative mt-0.5">
              <Avatar user={a.actor} size={compact ? "xs" : "sm"} />
              <span className="absolute -bottom-1 -right-1 flex size-4 items-center justify-center rounded-full border border-surface bg-sunken text-muted">
                <Icon className="size-2.5" strokeWidth={2.25} aria-hidden />
              </span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-ink-soft">
                {text}
                {showBoard && a.board && (
                  <>
                    {" in "}
                    <Link
                      to={`/board/${a.board.id}`}
                      className="font-medium text-ink hover:underline"
                    >
                      {a.board.title}
                    </Link>
                  </>
                )}
              </p>
              <p className="mt-0.5 text-xs text-faint">{timeAgo(a.createdAt)}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
