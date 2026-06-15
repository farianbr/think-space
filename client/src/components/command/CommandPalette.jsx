import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  Search,
  Plus,
  LayoutDashboard,
  FolderOpen,
  LayoutTemplate,
  Settings,
  SunMoon,
  Star,
  CornerDownLeft,
  Sparkles,
  Users,
  Activity,
  User,
} from "lucide-react";
import { useMyBoards } from "../../hooks/boards";
import { useTemplates, useUseTemplate } from "../../hooks/templates";
import { useTheme } from "../../contexts/themeContext";
import { cn } from "../../lib/cn";

/** Subsequence match so "qpb" matches "Q3 Product Brainstorm". */
function matches(query, text) {
  if (!query) return true;
  const q = query.toLowerCase();
  const t = (text || "").toLowerCase();
  if (t.includes(q)) return true;
  let i = 0;
  for (const ch of t) if (ch === q[i]) i++;
  return i === q.length;
}

export default function CommandPalette({ open, onClose, onCreateBoard }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const { cycleTheme } = useTheme();
  const { data: boards = [] } = useMyBoards("all");
  const { data: templates = [] } = useTemplates();
  const useTemplate = useUseTemplate();

  useEffect(() => {
    if (open) {
      setQuery("");
      setActive(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const go = (path) => {
    onClose?.();
    navigate(path);
  };

  const items = useMemo(() => {
    const actions = [
      { id: "new", group: "Actions", icon: Plus, label: "Create new board", keywords: "new create add board", run: () => { onClose?.(); onCreateBoard?.(); } },
      { id: "dashboard", group: "Navigate", icon: LayoutDashboard, label: "Go to Dashboard", run: () => go("/dashboard") },
      { id: "library", group: "Navigate", icon: FolderOpen, label: "Open Boards library", run: () => go("/boards") },
      { id: "favorites", group: "Navigate", icon: Star, label: "Open Favorites", run: () => go("/boards?filter=favorites") },
      { id: "templates", group: "Navigate", icon: LayoutTemplate, label: "Browse Templates", run: () => go("/templates") },
      { id: "team", group: "Navigate", icon: Users, label: "Open Team", keywords: "people collaborators", run: () => go("/team") },
      { id: "activity", group: "Navigate", icon: Activity, label: "Open Activity", keywords: "feed history", run: () => go("/activity") },
      { id: "profile", group: "Navigate", icon: User, label: "Open Profile", keywords: "account me", run: () => go("/profile") },
      { id: "settings", group: "Navigate", icon: Settings, label: "Open Settings", run: () => go("/settings") },
      { id: "theme", group: "Actions", icon: SunMoon, label: "Toggle theme", run: () => { cycleTheme(); } },
    ];

    const boardItems = boards.slice(0, 50).map((b) => ({
      id: `board-${b.id}`,
      group: "Boards",
      icon: b.isStarred ? Star : FolderOpen,
      label: b.title,
      sublabel: b._count?.notes != null ? `${b._count.notes} notes` : undefined,
      keywords: b.title,
      run: () => go(`/board/${b.id}`),
    }));

    const templateItems = templates.map((t) => ({
      id: `tpl-${t.slug}`,
      group: "Templates",
      icon: Sparkles,
      label: `Use “${t.title}” template`,
      sublabel: t.category,
      keywords: `${t.title} ${t.category} template`,
      run: async () => {
        onClose?.();
        try {
          const board = await useTemplate.mutateAsync({ slug: t.slug });
          toast.success("Board created from template");
          if (board?.id) navigate(`/board/${board.id}`);
        } catch {
          toast.error("Could not create from template");
        }
      },
    }));

    return [...actions, ...boardItems, ...templateItems].filter(
      (it) => matches(query, `${it.label} ${it.keywords || ""}`)
    );
  }, [boards, templates, query]); // eslint-disable-line react-hooks/exhaustive-deps

  // Group while preserving order
  const groups = useMemo(() => {
    const out = [];
    const idx = {};
    items.forEach((it) => {
      if (!(it.group in idx)) {
        idx[it.group] = out.length;
        out.push({ name: it.group, items: [] });
      }
      out[idx[it.group]].items.push(it);
    });
    return out;
  }, [items]);

  useEffect(() => {
    if (active >= items.length) setActive(items.length ? items.length - 1 : 0);
  }, [items.length, active]);

  const onKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((a) => Math.min(a + 1, items.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      items[active]?.run();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onClose?.();
    }
  };

  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [active]);

  if (!open) return null;

  let flatIdx = -1;
  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-start justify-center p-4 pt-[12vh]">
      <div className="absolute inset-0 bg-ink/35 backdrop-blur-[2px] animate-fade-in" onClick={onClose} aria-hidden />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Command menu"
        className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-pop animate-pop-in"
      >
        <div className="flex items-center gap-3 border-b border-hairline px-4">
          <Search className="size-[18px] text-faint" strokeWidth={2} aria-hidden />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActive(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search boards, templates, or run a command…"
            className="h-14 w-full bg-transparent text-[15px] text-ink placeholder:text-faint focus:outline-none"
            style={{ fontSize: "16px" }}
          />
          <kbd className="hidden shrink-0 rounded-md border border-hairline bg-surface px-1.5 py-0.5 text-[10px] font-medium text-faint sm:block">
            ESC
          </kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {items.length === 0 ? (
            <div className="px-3 py-10 text-center text-sm text-muted">
              No results for “{query}”
            </div>
          ) : (
            groups.map((g) => (
              <div key={g.name} className="mb-1">
                <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
                  {g.name}
                </div>
                {g.items.map((it) => {
                  flatIdx++;
                  const idx = flatIdx;
                  const Icon = it.icon;
                  const isActive = idx === active;
                  return (
                    <button
                      key={it.id}
                      data-idx={idx}
                      onMouseMove={() => setActive(idx)}
                      onClick={() => it.run()}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors",
                        isActive ? "bg-sunken text-ink" : "text-ink-soft"
                      )}
                    >
                      <Icon className="size-4 shrink-0 text-muted" strokeWidth={2} aria-hidden />
                      <span className="flex-1 truncate font-medium">{it.label}</span>
                      {it.sublabel && (
                        <span className="shrink-0 text-xs text-faint">{it.sublabel}</span>
                      )}
                      {isActive && (
                        <CornerDownLeft className="size-3.5 shrink-0 text-faint" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
