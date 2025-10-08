import { useEffect, useState } from "react";
import LoginForm from "../features/auth/LoginForm";
import { clearAuth, getUser } from "../lib/auth";
import { setSocketAuthFromStorage } from "../lib/socket";

export default function Header({ onAuthChange }) {
  const [user, setUser] = useState(() => getUser());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    onAuthChange?.(user);
  }, [user, onAuthChange]);

  function handleLogout() {
    clearAuth();
    setUser(null);
    setSocketAuthFromStorage(); // refresh socket auth
  }

  return (
    <header className="flex w-full items-center justify-between border-b bg-white px-4 py-2">
      <div className="text-lg font-semibold">💡 ThinkSpace</div>

      {!user ? (
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Sign in
          </button>
          {open && (
            <div className="absolute right-0 z-10 mt-2 w-64 rounded border bg-white p-3 shadow">
              <LoginForm
                onSuccess={(u) => {
                  setUser(u);
                  setSocketAuthFromStorage(); // refresh socket auth
                  setOpen(false);
                }}
              />
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-700">
            Signed in as <span className="font-medium">{user.email}</span>
          </span>
          <button
            onClick={handleLogout}
            className="rounded border px-3 py-1 text-sm hover:bg-gray-50"
          >
            Logout
          </button>
        </div>
      )}
    </header>
  );
}
