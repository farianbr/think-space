import { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { Modal, Input, Field, Button } from "../ui";
import { useUpdateBoard } from "../../hooks/boards";

export default function RenameBoardModal({ board, open, onClose }) {
  const [title, setTitle] = useState("");
  const update = useUpdateBoard();

  useEffect(() => {
    if (open && board) setTitle(board.title || "");
  }, [open, board]);

  const submit = async (e) => {
    e?.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return toast.error("Board name can't be empty");
    if (trimmed === board?.title) return onClose?.();
    try {
      await update.mutateAsync({ boardId: board.id, title: trimmed });
      toast.success("Board renamed");
      onClose?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not rename");
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Rename board"
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={update.isPending}>
            Save
          </Button>
        </>
      }
    >
      <form onSubmit={submit}>
        <Field label="Board name">
          <Input
            data-autofocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
        </Field>
      </form>
    </Modal>
  );
}
