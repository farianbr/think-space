import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search, Users, Layers } from "../lib/icons";

import { usePeople } from "../hooks/people";
import { Avatar, Badge, Card, EmptyState, Input, Skeleton } from "../components/ui";
import { roleMeta } from "../lib/roles";
import { timeAgo } from "../lib/format";

function RoleBadge({ role }) {
  const meta = roleMeta(role);
  const Icon = meta.icon;
  return (
    <Badge variant={role === "owner" ? "accent" : "neutral"}>
      <Icon className="size-3" strokeWidth={2} aria-hidden />
      {meta.label}
    </Badge>
  );
}

function PersonCard({ person }) {
  const boards = person.sharedBoards;
  const shown = boards.slice(0, 4);
  const extra = boards.length - shown.length;

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start gap-3">
        <Avatar user={person} src={person.avatarUrl} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">
            {person.name || person.email}
          </p>
          <p className="truncate text-xs text-muted">{person.email}</p>
        </div>
        <RoleBadge role={person.topRole} />
      </div>

      <div className="mt-4 flex items-center gap-1.5 text-xs text-muted">
        <Layers className="size-3.5" strokeWidth={2} aria-hidden />
        {person.sharedCount} shared board{person.sharedCount === 1 ? "" : "s"}
        {person.lastActiveAt && <span className="text-faint">Â· active {timeAgo(person.lastActiveAt)}</span>}
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {shown.map((b) => (
          <Link
            key={b.id}
            to={`/board/${b.id}`}
            className="group inline-flex max-w-full items-center gap-1.5 rounded-md border border-hairline bg-canvas px-2 py-1 text-xs text-ink-soft transition-colors hover:border-line hover:bg-sunken"
          >
            <span
              className="size-2 shrink-0 rounded-[3px]"
              style={{ backgroundColor: b.color || "var(--color-line)" }}
            />
            <span className="truncate">{b.title}</span>
          </Link>
        ))}
        {extra > 0 && (
          <span className="inline-flex items-center rounded-md px-2 py-1 text-xs text-faint">
            +{extra} more
          </span>
        )}
      </div>
    </Card>
  );
}

export default function TeamPage() {
  const { data: people, isLoading } = usePeople();
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const arr = people || [];
    if (!q.trim()) return arr;
    const needle = q.trim().toLowerCase();
    return arr.filter(
      (p) =>
        (p.name || "").toLowerCase().includes(needle) ||
        p.email.toLowerCase().includes(needle)
    );
  }, [people, q]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-ink">Team</h1>
        <p className="mt-1 text-sm text-muted">
          {isLoading
            ? "Loadingâ€¦"
            : `${(people || []).length} ${(people || []).length === 1 ? "person" : "people"} you collaborate with`}
        </p>
      </div>

      <div className="mb-6 w-full sm:max-w-xs">
        <Input
          icon={Search}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search peopleâ€¦"
          className="h-9"
        />
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44" />
          ))}
        </div>
      ) : list.length === 0 ? (
        q.trim() ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description={`No teammates match â€œ${q}â€.`}
          />
        ) : (
          <EmptyState
            icon={Users}
            title="No collaborators yet"
            description="Invite people to a board and they'll show up here as part of your team."
          />
        )
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((p) => (
            <PersonCard key={p.id} person={p} />
          ))}
        </div>
      )}
    </div>
  );
}
