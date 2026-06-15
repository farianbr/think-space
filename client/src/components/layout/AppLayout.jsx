import { useCallback, useEffect, useMemo, useState } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { CommandContext } from "../../contexts/commandContext";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import CommandPalette from "../command/CommandPalette";
import CreateBoardModal from "../board/CreateBoardModal";
import { cn } from "../../lib/cn";

function titleFor(loc) {
  const p = loc.pathname;
  if (p.startsWith("/dashboard")) return "Dashboard";
  if (p.startsWith("/templates")) return "Templates";
  if (p.startsWith("/settings")) return "Settings";
  if (p.startsWith("/boards"))
    return loc.search.includes("favorites") ? "Favorites" : "Boards";
  return "Think Space";
}

/**
 * Authenticated app shell: persistent sidebar (off-canvas drawer on mobile),
 * sticky top bar, and the global command palette + create-board dialog. Provides
 * the command context so any descendant can open the palette.
 */
export default function AppLayout() {
  const loc = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);

  const openCommand = useCallback(() => setCmdOpen(true), []);
  const closeCommand = useCallback(() => setCmdOpen(false), []);

  // Close the mobile drawer on navigation.
  useEffect(() => setDrawerOpen(false), [loc.pathname, loc.search]);

  // Global Cmd/Ctrl+K toggles the palette.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const cmdValue = useMemo(
    () => ({ open: cmdOpen, openCommand, closeCommand }),
    [cmdOpen, openCommand, closeCommand]
  );

  return (
    <CommandContext.Provider value={cmdValue}>
      <div className="min-h-screen bg-canvas">
        {/* Desktop sidebar */}
        <aside className="fixed inset-y-0 left-0 hidden w-64 border-r border-hairline bg-surface lg:block">
          <Sidebar onNewBoard={() => setCreateOpen(true)} />
        </aside>

        {/* Mobile drawer */}
        {drawerOpen && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div
              className="absolute inset-0 bg-ink/35 backdrop-blur-[2px] animate-fade-in"
              onClick={() => setDrawerOpen(false)}
            />
            <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] border-r border-hairline bg-surface shadow-pop animate-slide-in-right">
              <Sidebar
                onNavigate={() => setDrawerOpen(false)}
                onNewBoard={() => {
                  setDrawerOpen(false);
                  setCreateOpen(true);
                }}
              />
            </aside>
          </div>
        )}

        <div className={cn("flex min-h-screen flex-col lg:pl-64")}>
          <TopBar title={titleFor(loc)} onOpenMenu={() => setDrawerOpen(true)} />
          <main className="flex-1">
            <Outlet context={{ openCreateBoard: () => setCreateOpen(true) }} />
          </main>
        </div>
      </div>

      <CommandPalette
        open={cmdOpen}
        onClose={closeCommand}
        onCreateBoard={() => setCreateOpen(true)}
      />
      <CreateBoardModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </CommandContext.Provider>
  );
}
