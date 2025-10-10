export default function ActiveUsers({ activeList = [] }) {
  if (!activeList || activeList.length === 0) {
    return (
      <div className="p-2 text-sm text-gray-500">No collaborators online</div>
    );
  }

  return (
    <div className="p-2 space-y-2">
      {activeList.map((u) => {
        const user = u?.user ? u.user : u;
        const id = user?.id ?? u;
        const label = user?.name ?? user?.email ?? id;
        return (
          <div key={id} className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
              {label?.[0] ?? "?"}
            </div>
            <div className="text-sm">
              <div className="font-medium">{label}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
