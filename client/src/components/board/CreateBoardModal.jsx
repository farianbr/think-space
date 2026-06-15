import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import { Modal, Input, Textarea, Field, Button } from "../ui";
import { useCreateBoard } from "../../hooks/boards";

/**
 * Create-board dialog. On success navigates straight into the new board, which
 * matches the "start creating immediately" feel of Freeform/Notes.
 */
export default function CreateBoardModal({ open, onClose }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const createBoard = useCreateBoard();
  const navigate = useNavigate();

  const reset = () => {
    setTitle("");
    setDescription("");
  };

  const submit = async (e) => {
    e?.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return toast.error("Give your board a name");
    try {
      const board = await createBoard.mutateAsync({
        title: trimmed,
        ...(description.trim() ? { description: description.trim() } : {}),
      });
      toast.success("Board created");
      reset();
      onClose?.();
      if (board?.id) {
        window.currentBoardId = board.id;
        navigate(`/board/${board.id}`);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not create board");
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => {
        reset();
        onClose?.();
      }}
      title="New board"
      description="Name it now — you can rename it anytime."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={createBoard.isPending}>
            Create board
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="flex flex-col gap-4">
        <Field label="Board name" required>
          <Input
            data-autofocus
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Q3 Product Brainstorm"
            maxLength={120}
          />
        </Field>
        <Field label="Description" hint="Optional — a short line about this board.">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What's this space for?"
            maxLength={500}
            rows={3}
          />
        </Field>
      </form>
    </Modal>
  );
}
