import useMyBoards from '../hooks/useMyBoards';

export default function BoardsList() {
  const { data: boards, isLoading, isError, error } = useMyBoards();

  if (isLoading) return <div className="p-4">Loading boards...</div>;
  if (isError) return <div className="p-4 text-red-600">Error: {error?.message || 'Failed to load'}</div>;
  if (!boards || boards.length === 0) {
    return <div className="p-4">You haven't created any boards yet.</div>;
  }

  return (
    <div className="p-4 grid gap-3">
      {boards.map((b) => (
        <div key={b.id} className="p-3 rounded shadow-sm border flex items-center justify-between">
          <div>
            <div className="font-medium">{b.title}</div>
            <div className="text-sm text-gray-500">Notes: {b._count?.notes ?? 0}</div>
          </div>
          <div>
            <button
              className="px-3 py-1 rounded bg-blue-600 text-white text-sm"
              onClick={() => {
                window.location.href = `/boards/${b.id}`;
              }}
            >
              Open
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
