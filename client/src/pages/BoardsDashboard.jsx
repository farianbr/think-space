import React, { useEffect } from "react";
import CreateBoardForm from "../components/CreateBoardForm";
import { connectSocket } from "../lib/socket";
import { useNavigate } from "react-router-dom";
import { useMyBoards, useDeleteBoard, useBoardsSocket } from "../hooks/boards";
import { useAuth } from "../contexts/authContext";
import BoardGrid from "../components/BoardGrid";

export default function BoardsDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: boards, isLoading, isError, error } = useMyBoards();
  const deleteBoard = useDeleteBoard();

  // Setup socket connection and listeners
  const { setup } = useBoardsSocket();
  useEffect(() => {
    connectSocket();
    const cleanup = setup();
    return cleanup;
  }, [setup]);

  const handleOpenBoard = (boardId) => {
    window.currentBoardId = boardId;
    navigate(`/board/${boardId}`);
  };

  const handleDeleteBoard = async (board) => {
    if (!confirm(`Delete board "${board.title}"? This cannot be undone.`)) {
      return;
    }

    try {
      await deleteBoard.mutateAsync(board.id);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err?.message || "Delete failed");
    }
  };

  const handleBoardCreated = (board) => {
    handleOpenBoard(board.id);
  };

  // Separate owned and collaborative boards
  const ownedBoards =
    boards?.filter((board) => board.ownerId === user?.id) || [];
  const collaborativeBoards =
    boards?.filter((board) => board.ownerId !== user?.id) || [];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your boards...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-red-600">⚠️</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Something went wrong
          </h2>
          <p className="text-gray-600 mb-4">
            {error?.message || "Failed to load boards"}
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {user?.name || user?.email?.split("@")[0] || "there"}!
            👋
          </h1>
          <p className="text-lg text-gray-600">
            Manage your boards and collaborate with your team
          </p>
        </div>

        {/* Create Board Section */}
        <div className="mb-8">
          <CreateBoardForm onCreated={handleBoardCreated} />
        </div>

        {/* My Boards Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">My Boards</h2>
              <p className="text-gray-600">Boards you own and manage</p>
            </div>
            <div className="text-sm text-gray-500">
              {ownedBoards.length} board{ownedBoards.length !== 1 ? "s" : ""}
            </div>
          </div>

          <BoardGrid
            boards={ownedBoards}
            onOpenBoard={handleOpenBoard}
            onDeleteBoard={handleDeleteBoard}
            isOwner={true}
            deletingId={deleteBoard.isLoading ? deleteBoard.variables : null}
          />
        </section>

        {/* Collaborative Boards Section */}
        <section>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">
                Collaborative Boards
              </h2>
              <p className="text-gray-600">
                Boards you've been invited to collaborate on
              </p>
            </div>
            <div className="text-sm text-gray-500">
              {collaborativeBoards.length} board
              {collaborativeBoards.length !== 1 ? "s" : ""}
            </div>
          </div>

          <BoardGrid
            boards={collaborativeBoards}
            onOpenBoard={handleOpenBoard}
            onDeleteBoard={handleDeleteBoard}
            isOwner={false}
            deletingId={null}
          />
        </section>
      </div>
    </div>
  );
}
