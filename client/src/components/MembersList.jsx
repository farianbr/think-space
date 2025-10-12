import { useState } from "react";
import { Crown, UserMinus } from "lucide-react";

import { useBoardMembers, useRemoveBoardMember } from "../hooks/members";
import { useAuth } from "../contexts/authContext";

export default function MembersList({ boardId, boardOwnerId }) {
  const { data: members, isLoading, isError, error } = useBoardMembers(boardId);
  const removeMutation = useRemoveBoardMember(boardId);
  const { user } = useAuth();

  const isOwner = user?.id === boardOwnerId;
  const [confirmingUserId, setConfirmingUserId] = useState(null);

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
        <p className="text-xs text-gray-400 mt-1">
          Add collaborators to get started
        </p>
      </div>
    );
  }

  // Sort members to show owner first
  const sortedMembers = [...members].sort((a, b) => {
    // Owner comes first
    if (a.userId === boardOwnerId) return -1;
    if (b.userId === boardOwnerId) return 1;
    // Then sort alphabetically by name or email
    const aName = a.user?.name || a.user?.email || "";
    const bName = b.user?.name || b.user?.email || "";
    return aName.localeCompare(bName);
  });

  return (
    <>
      <div className="space-y-3">
        {sortedMembers.map((m) => (
          <div
            key={m.id}
            className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3 min-w-0">
              {/* Avatar */}
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-medium">
                  {(m.user?.name || m.user?.email || "U")
                    .charAt(0)
                    .toUpperCase()}
                </span>
              </div>

              {/* User Info: name on top, email wrapped below */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-gray-900 truncate">
                    {m.user?.name || m.user?.email?.split("@")[0] || "Unknown User"}
                  </div>
                  {m.userId === boardOwnerId && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <Crown size={12} />
                    </span>
                  )}
                  {m.user?.id === user?.id && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      You
                    </span>
                  )}
                </div>

                <div className="text-sm text-gray-500 mt-1 break-words">
                  {m.user?.email}
                </div>
              </div>
            </div>

            {/* Actions */}
            {isOwner && m.userId !== boardOwnerId && (
              <div className="flex-none ml-3">
                <button
                  className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  onClick={() => setConfirmingUserId(m.userId)}
                  disabled={removeMutation.isPending}
                  title="Remove member"
                >
                  {removeMutation.isPending ? (
                    <div className="w-4 h-4 border-2 border-gray-300 border-t-red-600 rounded-full animate-spin"></div>
                  ) : (
                    <UserMinus size={18} />
                  )}
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {confirmingUserId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setConfirmingUserId(null)}
          ></div>
          <div className="relative bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Remove member
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Are you sure you want to remove this member from the board? This
              action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setConfirmingUserId(null)}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  removeMutation.mutate(confirmingUserId, {
                    onSettled: () => setConfirmingUserId(null),
                  });
                }}
                disabled={removeMutation.isPending}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg disabled:bg-gray-300"
              >
                {removeMutation.isPending ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
