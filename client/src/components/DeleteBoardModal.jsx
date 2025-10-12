import React from 'react';
import { Trash2, AlertTriangle, X, Shield } from 'lucide-react';

export default function DeleteBoardModal({ isOpen, onClose, onConfirm, boardTitle, isDeleting }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      ></div>
      
      {/* Modal */}
      <div className="relative bg-white/90 backdrop-blur-md rounded-2xl shadow-2xl border border-white/20 p-8 max-w-md w-full mx-4 transform animate-in zoom-in-95 duration-300">
        {/* Close Button */}
        <button
          onClick={onClose}
          disabled={isDeleting}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
        >
          <X size={20} />
        </button>

        {/* Warning Icon */}
        <div className="text-center mb-6">
          <div className="relative mx-auto w-20 h-20 mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-red-400 to-orange-500 rounded-full animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-red-500 to-orange-600 rounded-full w-full h-full flex items-center justify-center shadow-lg">
              <AlertTriangle size={32} className="text-white" />
            </div>
            <div className="absolute -top-2 -right-2">
              <Shield size={16} className="text-yellow-400 animate-bounce" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Delete Board?
          </h2>
          <p className="text-slate-600 mb-2">
            Are you sure you want to delete <span className="font-semibold text-slate-900">"{boardTitle}"</span>?
          </p>
         
        </div>

        {/* Warning Box */}
        <div className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm rounded-xl border border-red-200">
          <div className="flex items-start gap-3">
            <AlertTriangle size={20} className="text-red-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 font-medium mb-1">
                Permanent Deletion
              </p>
              <p className="text-xs text-red-700">
                All notes, collaborations, and board data will be lost forever. This cannot be recovered.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 disabled:from-slate-400 disabled:to-slate-500 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02] disabled:transform-none disabled:cursor-not-allowed group"
          >
            {isDeleting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white mr-3"></div>
                Deleting...
              </>
            ) : (
              <>
                <Trash2 size={18} className="mr-2 group-hover:scale-110 transition-transform" />
                Delete Forever
              </>
            )}
          </button>
          
          <button
            onClick={onClose}
            disabled={isDeleting}
            className="flex-1 bg-slate-100 hover:bg-slate-200 disabled:bg-slate-50 text-slate-700 disabled:text-slate-400 font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:shadow-md disabled:cursor-not-allowed"
          >
            Cancel
          </button>
        </div>

        {/* Additional Warning */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-500">
            💡 Consider backing up important data before deletion
          </p>
        </div>
      </div>
    </div>
  );
}