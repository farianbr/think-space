import { useState } from "react";
import { Plus, Sparkles } from "lucide-react";
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
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
          <Sparkles size={20} className="text-blue-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Create New Board</h3>
          <p className="text-sm text-gray-600">Start a new collaborative workspace</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="board-title" className="block text-sm font-medium text-gray-700 mb-2">
            Board Title
          </label>
          <input
            id="board-title"
            type="text"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            placeholder="e.g., Project Planning, Team Brainstorm, Design Ideas..."
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            disabled={create.isLoading}
          />
        </div>

        {create.isError && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-600">
              {create.error?.response?.data?.message || create.error?.message || "Failed to create board"}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={create.isLoading || !title.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
        >
          {create.isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Creating...
            </>
          ) : (
            <>
              <Plus size={16} className="mr-2" />
              Create Board
            </>
          )}
        </button>
      </form>
    </div>
  );
}
