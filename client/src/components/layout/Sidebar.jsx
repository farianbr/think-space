import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  FolderOpen,
  Star,
  LayoutTemplate,
  Users,
  Activity,
  Plus,
  Sparkles,
  X,
} from "../../lib/icons";
import { useMyBoards } from "../../hooks/boards";
import { Button } from "../ui";
import { cn } from "../../lib/cn";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/boards", label: "Boards", icon: FolderOpen },
  { to: "/boards?filter=favorites", label: "Favorites", icon: Star },
  { to: "/templates", label: "Templates", icon: LayoutTemplate },
  { to: "/team", label: "Team", icon: Users },
  { to: "/activity", label: "Activity", icon: Activity },
];

function NavItem({ to, label, icon: Icon, onNavigate }) {
  const loc = useLocation();
  const [path, qs] = to.split("?");
  // Active when path matches; for the favorites shortcut also require the query.
  const active =
    loc.pathname === path &&
    (qs ? loc.search.includes(qs) : !(path === "/boards" && loc.search.includes("favorites")));

  return (
    <NavLink
      to={to}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        active ? "bg-sunken text-ink" : "text-muted hover:bg-sunken/60 hover:text-ink"
      )}
    >
      <Icon className="size-[18px] shrink-0" strokeWidth={2} aria-hidden />
      {label}
    </NavLink>
  );
}

export default function Sidebar({ onNavigate, onNewBoard }) {
  const { data: boards = [] } = useMyBoards("all");
  const recent = boards.slice(0, 6);

  return (
    <div className="flex h-full flex-col gap-1 px-3 py-4">
      <div className="flex items-center justify-between px-2 pb-2">
        <NavLink to="/dashboard" onClick={onNavigate} className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-ink text-ink-contrast">
            <Sparkles className="size-4" strokeWidth={2.25} aria-hidden />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-ink">Think Space</span>
        </NavLink>
        {/* Close button only matters in the mobile drawer */}
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="rounded-md p-1 text-muted hover:bg-sunken hover:text-ink lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      <Button icon={Plus} className="mx-1 mb-2 justify-start" onClick={onNewBoard}>
        New board
      </Button>

      <nav className="flex flex-col gap-0.5">
        {NAV.map((n) => (
          <NavItem key={n.label} {...n} onNavigate={onNavigate} />
        ))}
      </nav>

      {recent.length > 0 && (
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto">
          <div className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
            Recent
          </div>
          <div className="flex flex-col gap-0.5">
            {recent.map((b) => (
              <NavLink
                key={b.id}
                to={`/board/${b.id}`}
                onClick={onNavigate}
                className="group flex items-center gap-2.5 rounded-lg px-3 py-1.5 text-sm text-muted transition-colors hover:bg-sunken/60 hover:text-ink"
              >
                <span
                  className="size-2 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: b.color || "var(--color-line)" }}
                />
                <span className="truncate">{b.title}</span>
              </NavLink>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
