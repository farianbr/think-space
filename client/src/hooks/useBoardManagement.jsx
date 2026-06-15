import { useState } from "react";
import { toast } from "react-hot-toast";
import { useToggleStar, useUpdateBoard, useDeleteBoard } from "./boards";
import RenameBoardModal from "../components/board/RenameBoardModal";
import { ConfirmDialog } from "../components/ui";

/**
 * Centralizes the star / rename / archive / delete flows used by both the
 * dashboard and the library, including the modals. Returns card handlers plus
 * an element to render once near the page root.
 */
export function useBoardManagement() {
  const toggleStar = useToggleStar();
  const updateBoard = useUpdateBoard();
  const deleteBoard = useDeleteBoard();

  const [renameTarget, setRenameTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handlers = {
    onToggleStar: (board) =>
      toggleStar.mutate({ boardId: board.id, isStarred: board.isStarred }),
    onRename: (board) => setRenameTarget(board),
    onArchive: async (board) => {
      try {
        await updateBoard.mutateAsync({ boardId: board.id, isArchived: !board.isArchived });
        toast.success(board.isArchived ? "Board restored" : "Board archived");
      } catch (err) {
        toast.error(err?.response?.data?.message || "Action failed");
      }
    },
    onDelete: (board) => setDeleteTarget(board),
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteBoard.mutateAsync(deleteTarget.id);
      toast.success("Board deleted");
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Delete failed");
    }
  };

  const modals = (
    <>
      <RenameBoardModal
        board={renameTarget}
        open={!!renameTarget}
        onClose={() => setRenameTarget(null)}
      />
      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title={`Delete “${deleteTarget?.title || "board"}”?`}
        description="This permanently deletes the board and all its notes for everyone. This can't be undone."
        confirmLabel="Delete board"
        danger
        loading={deleteBoard.isPending}
      />
    </>
  );

  return { handlers, modals };
}
