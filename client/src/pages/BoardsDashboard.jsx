import React, { useEffect, useState } from "react";
import CreateBoardForm from "../components/CreateBoardForm";
import { connectSocket } from "../lib/socket";
import { useNavigate } from "react-router-dom";
import { useMyBoards, useDeleteBoard, useBoardsSocket } from "../hooks/boards";
import { useAuth } from "../contexts/authContext";
import BoardGrid from "../components/BoardGrid";
import BoardCreatedModal from "../components/BoardCreatedModal";
import DeleteBoardModal from "../components/DeleteBoardModal";
import { 
  BarChart3, 
  Users, 
  FileText, 
  Clock, 
  TrendingUp,
  Calendar,
  Activity
} from "lucide-react";

export default function BoardsDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: boards, isLoading, isError, error } = useMyBoards();
  const deleteBoard = useDeleteBoard();

  // Modal state for board creation
  const [showBoardCreatedModal, setShowBoardCreatedModal] = useState(false);
  const [createdBoard, setCreatedBoard] = useState(null);

  // Modal state for board deletion
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [boardToDelete, setBoardToDelete] = useState(null);

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
    setBoardToDelete(board);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!boardToDelete) return;

    try {
      await deleteBoard.mutateAsync(boardToDelete.id);
      setShowDeleteModal(false);
      setBoardToDelete(null);
    } catch (err) {
      console.error(err);
      alert(err?.response?.data?.message || err?.message || "Delete failed");
    }
  };

  const handleCloseDeleteModal = () => {
    setShowDeleteModal(false);
    setBoardToDelete(null);
  };

  const handleBoardCreated = (board) => {
    setCreatedBoard(board);
    setShowBoardCreatedModal(true);
  };

  const handleOpenCreatedBoard = () => {
    if (createdBoard) {
      handleOpenBoard(createdBoard.id);
    }
    setShowBoardCreatedModal(false);
    setCreatedBoard(null);
  };

  const handleCloseModal = () => {
    setShowBoardCreatedModal(false);
    setCreatedBoard(null);
  };

  // Combine all boards and sort by ownership and creation date
  const allBoards = boards || [];
  const sortedBoards = [...allBoards].sort((a, b) => {
    // First, sort by ownership (owned boards first)
    const aIsOwned = a.ownerId === user?.id;
    const bIsOwned = b.ownerId === user?.id;
    
    if (aIsOwned && !bIsOwned) return -1;
    if (!aIsOwned && bIsOwned) return 1;
    
    // Then sort by creation date (newest first)
    return new Date(b.createdAt) - new Date(a.createdAt);
  });

  // Calculate analytics
  const analytics = {
    totalBoards: allBoards.length,
    ownedBoards: allBoards.filter(board => board.ownerId === user?.id).length,
    collaborativeBoards: allBoards.filter(board => board.ownerId !== user?.id).length,
    totalNotes: allBoards.reduce((sum, board) => sum + (board._count?.notes || 0), 0),
    recentActivity: allBoards.filter(board => {
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      return new Date(board.updatedAt || board.createdAt) > weekAgo;
    }).length,
    mostActiveBoard: allBoards.reduce((most, board) => {
      const noteCount = board._count?.notes || 0;
      return noteCount > (most._count?.notes || 0) ? board : most;
    }, allBoards[0] || null)
  };

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Modern Header with Gradient */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                  Welcome back, {user?.name || user?.email?.split("@")[0] || "there"}! 👋
                </h1>
                <p className="text-lg text-slate-600">
                  Manage your boards and collaborate with your team
                </p>
              </div>
              <div className="hidden md:flex items-center space-x-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{analytics.totalBoards}</div>
                  <div className="text-sm text-slate-500">Total Boards</div>
                </div>
                <div className="w-px h-12 bg-slate-200"></div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-indigo-600">{analytics.totalNotes}</div>
                  <div className="text-sm text-slate-500">Total Notes</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Analytics Cards */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Your Boards</p>
                <p className="text-3xl font-bold text-blue-600">{analytics.ownedBoards}</p>
                <p className="text-xs text-slate-500 mt-1">Boards you own</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Collaborative</p>
                <p className="text-3xl font-bold text-green-600">{analytics.collaborativeBoards}</p>
                <p className="text-xs text-slate-500 mt-1">Shared with you</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <Users className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Total Notes</p>
                <p className="text-3xl font-bold text-purple-600">{analytics.totalNotes}</p>
                <p className="text-xs text-slate-500 mt-1">Across all boards</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg">
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6 hover:shadow-xl transition-all duration-300">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600 mb-1">Recent Activity</p>
                <p className="text-3xl font-bold text-orange-600">{analytics.recentActivity}</p>
                <p className="text-xs text-slate-500 mt-1">Active this week</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg">
                <Activity className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Quick Insights */}
        {analytics.mostActiveBoard && (
          <div className="mb-8">
            <div className="bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold mb-2 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Most Active Board
                  </h3>
                  <p className="text-blue-100 mb-1">
                    <span className="font-semibold text-white">{analytics.mostActiveBoard.title}</span> is your most active board
                  </p>
                  <p className="text-sm text-blue-200">
                    {analytics.mostActiveBoard._count?.notes || 0} notes • Created {new Date(analytics.mostActiveBoard.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleOpenBoard(analytics.mostActiveBoard.id)}
                  className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Open Board
                </button>
              </div>
            </div>
          </div>
        )}

        {/* All Boards Section with Create Board */}
        <section className="mb-12">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
                  <Calendar className="w-6 h-6 text-blue-600" />
                  Your Boards
                </h2>
                <p className="text-slate-600">All your boards in one place - owned and collaborative</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                  {allBoards.length} board{allBoards.length !== 1 ? "s" : ""}
                </div>
              </div>
            </div>

            {/* Create Board Section - Inline */}
            <div className="mb-8">
              <CreateBoardForm onCreated={handleBoardCreated} />
            </div>

            <BoardGrid
              boards={sortedBoards}
              onOpenBoard={handleOpenBoard}
              onDeleteBoard={handleDeleteBoard}
              deletingId={deleteBoard.isLoading ? deleteBoard.variables : null}
              userId={user?.id}
            />
          </div>
        </section>
      </div>

      {/* Board Created Modal */}
      <BoardCreatedModal
        isOpen={showBoardCreatedModal}
        onClose={handleCloseModal}
        onOpenBoard={handleOpenCreatedBoard}
        boardTitle={createdBoard?.title || ''}
      />

      {/* Delete Board Modal */}
      <DeleteBoardModal
        isOpen={showDeleteModal}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        boardTitle={boardToDelete?.title || ''}
        isDeleting={deleteBoard.isLoading}
      />
    </div>
  );
}
