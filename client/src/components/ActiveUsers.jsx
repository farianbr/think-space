export default function ActiveUsers({ activeList = [] }) {
  if (!activeList || activeList.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="w-10 h-10 bg-transparent rounded-full flex items-center justify-center mx-auto mb-1">
          <span className="text-lg text-gray-400">💤</span>
        </div>
        <p className="text-sm text-gray-500">No one else is here</p>
        <p className="text-xs text-gray-400 mt-1">Add collaborators to work together</p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {activeList.map((u) => {
        const user = u?.user ? u.user : u;
        const id = user?.id ?? u;
        const label = user?.name ?? user?.email ?? id;
        const displayName = user?.name || user?.email?.split("@")[0] || "Unknown User";

        return (
          <div key={id} className="flex items-center gap-3 py-1 px-2 rounded-md hover:bg-green-50">
            {/* Avatar with subtle online dot */}
            <div className="relative flex-shrink-0">
              <div className="w-7 h-7 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-medium">
                {(label?.[0] ?? "?").toUpperCase()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
            </div>

            {/* Compact user info */}
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-800 truncate">{displayName}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
