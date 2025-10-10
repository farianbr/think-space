import { useEffect } from "react";
import { useMyBoards, useDeleteBoard, useBoardsSocket } from "../hooks/boards";

export default function BoardsList({ onOpenBoard } = {}) {
  const { data: boards, isLoading, isError, error } = useMyBoards();
  const del = useDeleteBoard();
  // setup socket listeners for boards
  const { setup } = useBoardsSocket();
  useEffect(() => {
    const cleanup = setup(); // setup returns cleanup function per hooks/boards.js design
    return cleanup;
  }, [setup]);

  if (isLoading) return <div className="p-4">Loading boards…</div>;
  if (isError)
    return <div className="p-4 text-red-600">Error: {error?.message}</div>;

  if (!boards || boards.length === 0) {
    return (
      <div className="p-4 text-sm text-gray-500">
        You don’t have any boards yet.
      </div>
    );
  }

  return (
    <div className="space-y-3 p-3">
      {boards.map((b) => (
        <div
          key={b.id}
          className="flex items-center justify-between border rounded p-3 bg-white"
        >
          <div className="flex-1">
            <div className="font-medium text-sm">{b.title}</div>
            <div className="text-xs text-gray-500">
              Created: {new Date(b.createdAt).toLocaleString()}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              className="px-2 py-1 text-sm border rounded"
              onClick={() => onOpenBoard?.(b.id)}
            >
              Open
            </button>

            <button
              className="px-2 py-1 text-sm rounded bg-red-600 text-white"
              onClick={async () => {
                if (
                  !confirm(`Delete board "${b.title}"? This cannot be undone.`)
                )
                  return;
                try {
                  await del.mutateAsync(b.id);
                } catch (err) {
                  console.error(err);
                  alert(
                    err?.response?.data?.message ||
                      err?.message ||
                      "Delete failed"
                  );
                }
              }}
              disabled={del.isLoading}
            >
              {del.isLoading ? "Deleting…" : "Delete"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
