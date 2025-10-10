// client/src/pages/BoardsDashboard.jsx
import React, { useEffect } from "react";
import CreateBoardForm from "../components/CreateBoardForm";
import BoardsList from "../components/BoardsList";
import { connectSocket } from "../lib/socket"; // ensure socket connected on page load
import { useNavigate } from "react-router-dom";

export default function BoardsDashboard() {
  const navigate = useNavigate();
  // ensure socket connected (no-op if already connected)
  useEffect(() => {
    connectSocket();
  }, []);

  const handleOpen = (boardId) => {
    // store current board (used by some flows) and navigate
    window.currentBoardId = boardId;

    navigate(`/board/${boardId}`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="grid md:grid-cols-2 gap-4">
        <CreateBoardForm onCreated={(board) => handleOpen(board.id)} />
        <div className="p-3 border rounded bg-white shadow-sm">
          <h3 className="font-medium mb-2">Your boards</h3>
          <BoardsList onOpenBoard={handleOpen} />
        </div>
      </div>
    </div>
  );
}
