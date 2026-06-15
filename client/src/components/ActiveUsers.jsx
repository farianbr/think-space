import { Avatar } from "./ui";
import { displayName } from "../lib/format";

export default function ActiveUsers({ activeList = [] }) {
  if (!activeList || activeList.length === 0) {
    return (
      <p className="px-1 py-3 text-sm text-muted">No one else is here right now.</p>
    );
  }

  return (
    <div className="space-y-0.5">
      {activeList.map((u) => {
        const user = u?.user ? u.user : u;
        const id = user?.id ?? u;
        return (
          <div key={id} className="flex items-center gap-3 rounded-lg px-1 py-1.5">
            <span className="relative">
              <Avatar user={user} size="sm" />
              <span className="absolute -bottom-0.5 -right-0.5 size-2.5 rounded-full border-2 border-surface bg-positive" />
            </span>
            <span className="truncate text-sm font-medium text-ink-soft">
              {displayName(user)}
            </span>
          </div>
        );
      })}
    </div>
  );
}
