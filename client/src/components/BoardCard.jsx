import React from 'react'

const BoardCard = ({ board, onOpen, onDelete, isOwner, isDeleting }) => {
  return (
    <div className="group bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-gray-300 transition-all duration-200 overflow-hidden">
      {/* Board Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-semibold text-gray-900 text-lg truncate pr-2">
            {board.title}
          </h3>
          {isOwner && (
            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 whitespace-nowrap">
              Owner
            </span>
          )}
        </div>
        
        {/* Board Stats */}
        <div className="flex items-center space-x-4 text-sm text-gray-500 mb-4">
          <span className="flex items-center">
            📝 {board._count?.notes || 0} notes
          </span>
          <span className="flex items-center">
            📅 {new Date(board.createdAt).toLocaleDateString()}
          </span>
        </div>
      </div>

      {/* Board Actions */}
      <div className="px-6 pb-6 flex items-center justify-between">
        <button
          onClick={() => onOpen(board.id)}
          className="flex-1 mr-3 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
        >
          Open Board
        </button>
        
        {isOwner && (
          <button
            onClick={() => onDelete(board)}
            disabled={isDeleting}
            className="px-3 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 hover:border-red-300 transition-colors disabled:opacity-50"
          >
            {isDeleting ? "..." : "🗑️"}
          </button>
        )}
      </div>
    </div>
  );
}

export default BoardCard