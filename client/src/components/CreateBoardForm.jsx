import { useState } from "react";
import { useCreateBoard } from "../hooks/boards";

export default function CreateBoardForm({ onCreated } = {}) {
  const [title, setTitle] = useState("");
  const create = useCreateBoard();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return alert("Please enter a board title");
    try {
      const board = await create.mutateAsync({ title: title.trim() });
      setTitle("");
      if (onCreated) onCreated(board);
    } catch (err) {
      console.error("Create board error", err);
      alert(err?.response?.data?.message || err?.message || "Create failed");
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="p-3 border rounded bg-white shadow-sm"
    >
      <label className="block text-sm font-medium mb-2">Create board</label>
      <div className="flex gap-2">
        <input
          className="flex-1 p-2 border rounded"
          placeholder="New board title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={create.isLoading}
        />
        <button
          type="submit"
          className="px-3 py-2 bg-blue-600 text-white rounded"
          disabled={create.isLoading}
        >
          {create.isLoading ? "Creating…" : "Create"}
        </button>
      </div>
      {create.isError && (
        <div className="text-sm text-red-600 mt-2">{create.error?.message}</div>
      )}
    </form>
  );
}
