import React from 'react';
import { CheckCircle, ArrowRight, X, Sparkles } from 'lucide-react';

export default function BoardCreatedModal({ isOpen, onClose, onOpenBoard, boardTitle }) {
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
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>

        {/* Success Icon */}
        <div className="text-center mb-6">
          <div className="relative mx-auto w-20 h-20 mb-4">
            <div className="absolute inset-0 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full animate-pulse"></div>
            <div className="relative bg-gradient-to-r from-green-500 to-emerald-600 rounded-full w-full h-full flex items-center justify-center shadow-lg">
              <CheckCircle size={32} className="text-white" />
            </div>
            <div className="absolute -top-2 -right-2">
              <Sparkles size={16} className="text-yellow-400 animate-bounce" />
            </div>
          </div>
          
          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            Board Created Successfully! 🎉
          </h2>
          <p className="text-slate-600">
            Your board <span className="font-semibold text-slate-900">"{boardTitle}"</span> is ready to go
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onOpenBoard}
            className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-semibold py-3 px-6 rounded-xl transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl transform hover:scale-[1.02] group"
          >
            <ArrowRight size={18} className="mr-2 group-hover:translate-x-1 transition-transform" />
            Open Board
          </button>
          
          <button
            onClick={onClose}
            className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 px-6 rounded-xl transition-all duration-200 hover:shadow-md"
          >
            Stay Here
          </button>
        </div>

        {/* Quick tip */}
        <div className="mt-6 p-4 bg-blue-50/80 backdrop-blur-sm rounded-xl border border-blue-100">
          <p className="text-sm text-blue-700 text-center">
            💡 <span className="font-medium">Tip:</span> You can always find your board in the dashboard later
          </p>
        </div>
      </div>
    </div>
  );
}