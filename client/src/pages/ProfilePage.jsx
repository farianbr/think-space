import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Settings, FolderOpen, Users, Star, CalendarDays } from "lucide-react";

import { useAuth } from "../contexts/authContext";
import { useMyBoards } from "../hooks/boards";
import { usePeople } from "../hooks/people";
import { useWorkspaceActivity } from "../hooks/activity";
import { Avatar, Button, Card, EmptyState, Skeleton, AvatarGroup } from "../components/ui";
import { describeActivity } from "../lib/activityText";
import { displayName, timeAgo, formatDate } from "../lib/format";

function Stat({ icon: Icon, value, label }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-muted">
        <Icon className="size-4" strokeWidth={2} aria-hidden />
        <span className="text-xs font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-semibold tracking-tight text-ink">{value}</p>
    </Card>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { data: boards = [], isLoading: boardsLoading } = useMyBoards("all");
  const { data: people = [] } = usePeople();
  const { data: activities = [], isLoading: actLoading } = useWorkspaceActivity(100);

  const owned = useMemo(
    () => boards.filter((b) => b.ownerId === user?.id).length,
    [boards, user?.id]
  );
  const starred = useMemo(() => boards.filter((b) => b.isStarred).length, [boards]);

  // This user's own recent actions.
  const mine = useMemo(
    () => (activities || []).filter((a) => a.actor?.id === user?.id).slice(0, 8),
    [activities, user?.id]
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <Card className="p-6 sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
          <Avatar user={user} src={user?.avatarUrl} size="xl" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-ink">
              {displayName(user)}
            </h1>
            <p className="truncate text-sm text-muted">{user?.email}</p>
            {user?.createdAt && (
              <p className="mt-1.5 flex items-center gap-1.5 text-xs text-faint">
                <CalendarDays className="size-3.5" strokeWidth={2} aria-hidden />
                Joined {formatDate(user.createdAt)}
              </p>
            )}
          </div>
          <Button as={Link} to="/settings" variant="secondary" icon={Settings}>
            Edit profile
          </Button>
        </div>
      </Card>

      {/* Stats */}
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat icon={FolderOpen} value={boardsLoading ? "—" : boards.length} label="Boards" />
        <Stat icon={FolderOpen} value={boardsLoading ? "—" : owned} label="Owned" />
        <Stat icon={Star} value={boardsLoading ? "—" : starred} label="Starred" />
        <Stat icon={Users} value={people.length} label="Collaborators" />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[1.6fr_1fr]">
        {/* Recent activity */}
        <Card className="overflow-hidden p-0">
          <div className="border-b border-hairline px-5 py-3.5">
            <h2 className="text-sm font-semibold text-ink">Your recent activity</h2>
          </div>
          {actLoading ? (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-10" />
              ))}
            </div>
          ) : mine.length === 0 ? (
            <EmptyState
              size="sm"
              icon={FolderOpen}
              title="Nothing yet"
              description="Create or edit a board and your activity will appear here."
            />
          ) : (
            <ul className="divide-y divide-hairline">
              {mine.map((a) => {
                const { icon: Icon, text } = describeActivity(a);
                return (
                  <li key={a.id} className="flex items-start gap-3 px-5 py-3">
                    <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-sunken text-muted">
                      <Icon className="size-3.5" strokeWidth={2} aria-hidden />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-ink-soft">{text}</p>
                      <p className="text-xs text-faint">
                        {a.board && (
                          <Link to={`/board/${a.board.id}`} className="hover:underline">
                            {a.board.title}
                          </Link>
                        )}
                        {a.board && " · "}
                        {timeAgo(a.createdAt)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Collaborators preview */}
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-ink">Collaborators</h2>
            <Link to="/team" className="text-xs font-medium text-muted hover:text-ink">
              View all
            </Link>
          </div>
          {people.length === 0 ? (
            <p className="mt-4 text-sm text-muted">
              Invite people to a board to start collaborating.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <AvatarGroup users={people} max={6} size="md" />
              <ul className="space-y-2.5 pt-1">
                {people.slice(0, 5).map((p) => (
                  <li key={p.id} className="flex items-center gap-2.5">
                    <Avatar user={p} src={p.avatarUrl} size="xs" />
                    <span className="min-w-0 flex-1 truncate text-sm text-ink-soft">
                      {p.name || p.email}
                    </span>
                    <span className="shrink-0 text-xs text-faint">{p.sharedCount}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
