import React, { useState, useEffect } from 'react'
import { api } from '../lib/api'

const BoardCard = ({ board, onOpen, onDelete, isOwner, isDeleting }) => {
  const [notes, setNotes] = useState([]);
  const [notesLoading, setNotesLoading] = useState(true);

  // Fetch board notes for preview
  useEffect(() => {
    const fetchNotes = async () => {
      try {
        setNotesLoading(true);
        const response = await api.get(`/boards/${board.id}/notes`);
        setNotes(response.data.notes || []);
      } catch (error) {
        console.error('Failed to fetch notes for preview:', error);
        setNotes([]);
      } finally {
        setNotesLoading(false);
      }
    };

    fetchNotes();
  }, [board.id]);

  // Create a mini preview of the board
  const renderBoardPreview = () => {
    if (notesLoading) {
      return (
        <div className="w-full h-32 bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl flex items-center justify-center border border-slate-200">
          <div className="flex items-center gap-2 text-slate-400">
            <div className="w-4 h-4 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin"></div>
            <span className="text-sm">Loading preview...</span>
          </div>
        </div>
      );
    }

    if (notes.length === 0) {
      return (
        <div className="w-full h-32 bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl flex items-center justify-center border-2 border-dashed border-slate-300">
          <div className="text-center text-slate-400">
            <div className="text-3xl mb-2">📝</div>
            <div className="text-sm font-medium">Empty board</div>
            <div className="text-xs">Start adding notes</div>
          </div>
        </div>
      );
    }

    // Show up to 6 notes in a mini grid
    const previewNotes = notes.slice(0, 6);
    
    return (
      <div className="w-full h-32 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 rounded-xl relative overflow-hidden border border-blue-100 shadow-inner">
        <div className="absolute inset-2 grid grid-cols-3 gap-1.5">
          {previewNotes.map((note) => (
            <div
              key={note.id}
              className="rounded-lg text-xs p-1.5 shadow-sm border border-white/50 opacity-90 hover:opacity-100 transition-all duration-200 hover:scale-105 backdrop-blur-sm"
              style={{
                backgroundColor: note.color || '#fef3c7',
                fontSize: '7px',
                lineHeight: '1.3'
              }}
            >
              <div className="truncate font-semibold text-slate-700">
                {note.text ? note.text.slice(0, 15) + (note.text.length > 15 ? '...' : '') : '✨'}
              </div>
            </div>
          ))}
          {notes.length > 6 && (
            <div className="rounded-lg bg-white/80 backdrop-blur-sm text-slate-600 flex items-center justify-center text-xs font-bold border border-white/50 shadow-sm">
              +{notes.length - 6}
            </div>
          )}
        </div>
        {/* Subtle overlay gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-white/20 to-transparent rounded-xl pointer-events-none"></div>
      </div>
    );
  };

  return (
    <div className="group bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-white/20 hover:shadow-xl hover:border-white/40 transition-all duration-300 overflow-hidden hover:scale-[1.02]">
      {/* Board Preview */}
      <div className="p-4 pb-3">
        {renderBoardPreview()}
      </div>

      {/* Board Header */}
      <div className="px-4 pb-4">
        <div className="flex items-start justify-between mb-3">
          <h3 className="font-bold text-slate-900 text-lg truncate pr-2 group-hover:text-blue-600 transition-colors">
            {board.title}
          </h3>
          <div className="flex items-center gap-2 flex-shrink-0">
            {isOwner ? (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm">
                Owner
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm">
                Member
              </span>
            )}
          </div>
        </div>
        
        {/* Board Stats */}
        <div className="flex items-center justify-between text-sm text-slate-500 mb-4">
          <span className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg">
            📝 {notes.length} notes
          </span>
          <span className="text-xs bg-slate-100 px-2 py-1 rounded-lg">
            {new Date(board.createdAt).toLocaleDateString()}
          </span>
        </div>

        {/* Board Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onOpen(board.id)}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg"
          >
            Open Board
          </button>
          
          {isOwner && (
            <button
              onClick={() => onDelete(board)}
              disabled={isDeleting}
              className="px-3 py-2.5 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg border border-red-200 hover:border-red-300 transition-colors disabled:opacity-50 shadow-sm hover:shadow-md"
            >
              {isDeleting ? (
                <div className="w-4 h-4 border-2 border-red-300 border-t-red-600 rounded-full animate-spin"></div>
              ) : (
                "🗑️"
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default BoardCard