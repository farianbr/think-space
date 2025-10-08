import { useBoardMembers, useRemoveBoardMember } from "../hooks/members";

export default function MembersList({ boardId }) {
  const { data: members, isLoading, isError, error } = useBoardMembers(boardId);
  const removeMutation = useRemoveBoardMember(boardId);

  if (isLoading) return <div className="p-4">Loading members...</div>;
  if (isError)
    return <div className="p-4 text-red-600">Error: {error?.message}</div>;

  if (!members || members.length === 0) {
    return <div className="p-4 text-sm text-gray-500">No members yet.</div>;
  }

  return (
    <div className="p-4 space-y-2">
      {members.map((m) => (
        <div
          key={m.id}
          className="flex items-center justify-between border rounded p-2"
        >
          <div>
            <div className="font-medium">
              {m.user?.name ?? m.user?.email ?? m.userId}
            </div>
            <div className="text-sm text-gray-500">{m.role}</div>
          </div>
          <div>
            <button
              className="px-2 py-1 text-sm rounded bg-red-600 text-white"
              onClick={() => {
                if (!confirm(`Remove ${m.user?.email || m.userId} from board?`))
                  return;
                removeMutation.mutate(m.userId);
              }}
            >
              {removeMutation.isLoading ? "Removing..." : "Remove"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
