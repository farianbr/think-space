import { useMemo, useState } from "react";
import { useSearchParams, useOutletContext } from "react-router-dom";
import {
  LayoutGrid,
  List,
  Plus,
  Search,
  ChevronDown,
  FolderOpen,
  Star,
  Users,
  Archive,
} from "../lib/icons";

import { useAuth } from "../contexts/authContext";
import { useMyBoards } from "../hooks/boards";
import { useBoardManagement } from "../hooks/useBoardManagement";
import BoardCard from "../components/board/BoardCard";
import {
  Button,
  Segmented,
  Input,
  EmptyState,
  Skeleton,
  DropdownMenu,
} from "../components/ui";
import { cn } from "../lib/cn";

const TABS = [
  { value: "all", label: "All", icon: FolderOpen },
  { value: "owned", label: "Owned", icon: FolderOpen },
  { value: "shared", label: "Shared", icon: Users },
  { value: "favorites", label: "Favorites", icon: Star },
  { value: "archived", label: "Archived", icon: Archive },
];

const SORTS = [
  { value: "recent", label: "Last active" },
  { value: "name", label: "Name" },
  { value: "notes", label: "Most notes" },
];

const EMPTY = {
  all: { icon: FolderOpen, title: "No boards yet", description: "Create your first board to get started." },
  owned: { icon: FolderOpen, title: "You don't own any boards", description: "Boards you create will appear here." },
  shared: { icon: Users, title: "Nothing shared with you", description: "Boards others invite you to show up here." },
  favorites: { icon: Star, title: "No favorites yet", description: "Star a board to pin it here for quick access." },
  archived: { icon: Archive, title: "No archived boards", description: "Archive a board to tuck it away without deleting it." },
};

export default function BoardsLibrary() {
  const { user } = useAuth();
  const [params, setParams] = useSearchParams();
  const filter = params.get("filter") || "all";
  const { openCreateBoard } = useOutletContext() || {};

  const [view, setView] = useState("grid");
  const [sort, setSort] = useState("recent");
  const [q, setQ] = useState("");

  const { data: boards, isLoading } = useMyBoards(filter);
  const { handlers, modals } = useBoardManagement();

  const list = useMemo(() => {
    let arr = [...(boards || [])];
    if (q.trim()) {
      const needle = q.trim().toLowerCase();
      arr = arr.filter((b) => b.title.toLowerCase().includes(needle));
    }
    arr.sort((a, b) => {
      if (sort === "name") return a.title.localeCompare(b.title);
      if (sort === "notes") return (b._count?.notes || 0) - (a._count?.notes || 0);
      return (
        new Date(b.lastActivityAt || b.updatedAt) - new Date(a.lastActivityAt || a.updatedAt)
      );
    });
    return arr;
  }, [boards, q, sort]);

  const setFilter = (next) => {
    const p = new URLSearchParams(params);
    if (next === "all") p.delete("filter");
    else p.set("filter", next);
    setParams(p, { replace: true });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">Boards</h1>
          <p className="mt-1 text-sm text-muted">
            {isLoading ? "Loading…" : `${list.length} board${list.length === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button icon={Plus} onClick={openCreateBoard}>
          New board
        </Button>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex items-center gap-1 overflow-x-auto border-b border-hairline pb-px">
        {TABS.map((t) => {
          const active = filter === t.value;
          return (
            <button
              key={t.value}
              onClick={() => setFilter(t.value)}
              className={cn(
                "relative whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors",
                active ? "text-ink" : "text-muted hover:text-ink"
              )}
            >
              {t.label}
              {active && (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-ink" />
              )}
            </button>
          );
        })}
      </div>

      {/* Controls */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <div className="w-full sm:max-w-xs">
          <Input
            icon={Search}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search boards…"
            className="h-9"
          />
        </div>
        <div className="ml-auto flex items-center gap-2">
          <DropdownMenu
            align="end"
            trigger={
              <Button variant="secondary" size="sm" iconRight={ChevronDown}>
                {SORTS.find((s) => s.value === sort)?.label}
              </Button>
            }
          >
            {SORTS.map((s) => (
              <DropdownMenu.Item key={s.value} onSelect={() => setSort(s.value)}>
                {s.label}
              </DropdownMenu.Item>
            ))}
          </DropdownMenu>
          <Segmented
            size="sm"
            value={view}
            onChange={setView}
            options={[
              { value: "grid", icon: LayoutGrid, title: "Grid" },
              { value: "list", icon: List, title: "List" },
            ]}
          />
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        view === "grid" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-52" />
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-16" />
            ))}
          </div>
        )
      ) : list.length === 0 ? (
        q.trim() ? (
          <EmptyState
            icon={Search}
            title="No matches"
            description={`No boards match “${q}”.`}
          />
        ) : (
          <EmptyState
            {...EMPTY[filter]}
            action={
              filter !== "archived" && (
                <Button icon={Plus} onClick={openCreateBoard}>
                  New board
                </Button>
              )
            }
          />
        )
      ) : view === "grid" ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((b) => (
            <BoardCard key={b.id} board={b} currentUserId={user?.id} {...handlers} />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {list.map((b) => (
            <BoardCard key={b.id} board={b} currentUserId={user?.id} view="list" {...handlers} />
          ))}
        </div>
      )}

      {modals}
    </div>
  );
}
