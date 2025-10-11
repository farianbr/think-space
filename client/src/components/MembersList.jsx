import { useBoardMembers, useRemoveBoardMember } from "../hooks/members";
import { useAuth } from "../contexts/authContext";

export default function MembersList({ boardId, boardOwnerId }) {
  const { data: members, isLoading, isError, error } = useBoardMembers(boardId);
  const removeMutation = useRemoveBoardMember(boardId);
  const { user } = useAuth();
  
  const isOwner = user?.id === boardOwnerId;

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse flex items-center space-x-3">
            <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-1"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
        <p className="text-red-600 text-sm">Error: {error?.message}</p>
      </div>
    );
  }

  if (!members || members.length === 0) {
    return (
      <div className="text-center py-6">
        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
          <span className="text-2xl text-gray-400">👥</span>
        </div>
        <p className="text-sm text-gray-500">No members yet</p>
        <p className="text-xs text-gray-400 mt-1">Invite collaborators to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {members.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <div className="flex items-center space-x-3">
            {/* Avatar */}
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {(m.user?.name || m.user?.email || 'U').charAt(0).toUpperCase()}
              </span>
            </div>
            
            {/* User Info */}
            <div>
              <div className="font-medium text-gray-900">
                {m.user?.name || m.user?.email?.split('@')[0] || 'Unknown User'}
              </div>
              <div className="text-sm text-gray-500 flex items-center space-x-2">
                <span>{m.user?.email}</span>
                {m.userId === boardOwnerId && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    Owner
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          {isOwner && m.userId !== boardOwnerId && (
            <button
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              onClick={() => {
                if (!confirm(`Remove ${m.user?.email || m.userId} from board?`))
                  return;
                removeMutation.mutate(m.userId);
              }}
              disabled={removeMutation.isLoading}
              title="Remove member"
            >
              {removeMutation.isLoading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin"></div>
              ) : (
                <span className="text-lg">🗑️</span>
              )}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
