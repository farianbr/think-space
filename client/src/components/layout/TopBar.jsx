import { useNavigate } from "react-router-dom";
import { Menu, Search, Settings, User, LogOut } from "../../lib/icons";
import { useAuth } from "../../contexts/authContext";
import { useCommand } from "../../contexts/commandContext";
import { setSocketAuthFromStorage } from "../../lib/socket";
import { Avatar, DropdownMenu, IconButton } from "../ui";
import NotificationCenter from "../notifications/NotificationCenter";
import { displayName } from "../../lib/format";

export default function TopBar({ title, onOpenMenu }) {
  const { user, logout } = useAuth();
  const { openCommand } = useCommand();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    setSocketAuthFromStorage();
    navigate("/login");
  };

  const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-hairline bg-canvas/80 px-4 backdrop-blur-md sm:px-6">
      <button
        onClick={onOpenMenu}
        className="rounded-lg p-2 text-muted hover:bg-sunken hover:text-ink lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="size-5" />
      </button>

      <h1 className="truncate text-[15px] font-semibold tracking-tight text-ink">{title}</h1>

      <div className="ml-auto flex items-center gap-2">
        {/* Search trigger → command palette */}
        <button
          onClick={() => openCommand()}
          className="hidden h-9 items-center gap-2 rounded-lg border border-hairline bg-surface px-3 text-sm text-faint transition-colors hover:border-line hover:text-muted sm:flex"
        >
          <Search className="size-4" strokeWidth={2} aria-hidden />
          <span className="pr-6">Search…</span>
          <kbd className="rounded border border-hairline bg-canvas px-1.5 py-0.5 text-[10px] font-medium text-faint">
            {isMac ? "⌘" : "Ctrl"} K
          </kbd>
        </button>
        <IconButton
          icon={Search}
          label="Search"
          onClick={() => openCommand()}
          className="sm:hidden"
        />

        <NotificationCenter />

        <DropdownMenu
          align="end"
          width="min-w-56"
          trigger={
            <button
              className="flex items-center rounded-full ring-offset-2 ring-offset-canvas transition hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
              aria-label="Account menu"
            >
              <Avatar user={user} size="sm" src={user?.avatarUrl} tooltipSide="bottom-end" />
            </button>
          }
        >
          <div className="flex items-center gap-3 px-2.5 py-2">
            <Avatar user={user} size="md" src={user?.avatarUrl} />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-ink">{displayName(user)}</div>
              <div className="truncate text-xs text-muted">{user?.email}</div>
            </div>
          </div>
          <DropdownMenu.Separator />
          <DropdownMenu.Item icon={User} onSelect={() => navigate("/profile")}>
            Profile
          </DropdownMenu.Item>
          <DropdownMenu.Item icon={Settings} onSelect={() => navigate("/settings")}>
            Settings
          </DropdownMenu.Item>
          <DropdownMenu.Separator />
          <DropdownMenu.Item icon={LogOut} danger onSelect={handleLogout}>
            Sign out
          </DropdownMenu.Item>
        </DropdownMenu>
      </div>
    </header>
  );
}
