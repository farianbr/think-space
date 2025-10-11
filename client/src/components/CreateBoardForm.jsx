import { useState } from "react";
import { Plus, Sparkles, Zap, ArrowRight } from "lucide-react";
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
    <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
      <div className="flex items-center mb-6">
        <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4 shadow-lg">
          <Sparkles size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            Create New Board
            <Zap size={16} className="text-yellow-500" />
          </h3>
          <p className="text-sm text-slate-600">Start a new collaborative workspace</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="board-title" className="block text-sm font-semibold text-slate-700 mb-3">
            Board Title
          </label>
          <div className="relative">
            <input
              id="board-title"
              type="text"
              className="w-full px-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 text-base bg-white/50 backdrop-blur-sm placeholder-slate-400"
              style={{ fontSize: "16px" }} // Prevent zoom on iOS
              placeholder="e.g., Project Planning, Team Brainstorm, Design Ideas..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={create.isLoading}
            />
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none">
              <ArrowRight size={16} className={`transition-colors ${title.trim() ? 'text-blue-500' : 'text-slate-300'}`} />
            </div>
          </div>
        </div>

        {create.isError && (
          <div className="p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-xl">
            <p className="text-sm text-red-600 font-medium">
              {create.error?.response?.data?.message || create.error?.message || "Failed to create board"}
            </p>
          </div>
        )}

        <button
          type="submit"
          disabled={create.isLoading || !title.trim()}
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:from-slate-300 disabled:to-slate-400 disabled:cursor-not-allowed text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none"
        >
          {create.isLoading ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3"></div>
              Creating Board...
            </>
          ) : (
            <>
              <Plus size={18} className="mr-2" />
              Create Board
            </>
          )}
        </button>
      </form>
    </div>
  );
}
