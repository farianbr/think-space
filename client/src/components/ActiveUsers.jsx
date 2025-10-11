export default function ActiveUsers({ activeList = [] }) {
  if (!activeList || activeList.length === 0) {
    return (
      <div className="text-center py-4">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
          <span className="text-2xl text-gray-400">💤</span>
        </div>
        <p className="text-sm text-gray-500">No one else is here</p>
        <p className="text-xs text-gray-400 mt-1">Invite collaborators to work together</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {activeList.map((u) => {
        const user = u?.user ? u.user : u;
        const id = user?.id ?? u;
        const label = user?.name ?? user?.email ?? id;
        const displayName = user?.name || user?.email?.split('@')[0] || 'Unknown User';
        
        return (
          <div key={id} className="flex items-center space-x-3 p-2 bg-green-50 rounded-lg border border-green-200">
            {/* Avatar with online indicator */}
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-green-600 text-white flex items-center justify-center text-sm font-medium">
                {(label?.[0] ?? "?").toUpperCase()}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 border-2 border-white rounded-full animate-pulse"></div>
            </div>
            
            {/* User info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-green-900 text-sm truncate">
                {displayName}
              </div>
              <div className="text-xs text-green-600 flex items-center">
                <span className="w-1 h-1 bg-green-500 rounded-full mr-1"></span>
                Active now
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
