import { X, HelpCircle } from "lucide-react";

export default function MobileHelpModal({ isOpen, onClose }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm mx-4 max-h-[80vh] overflow-y-auto">
        {/* Modal Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <HelpCircle size={20} className="text-blue-600" />
              <h2 className="text-lg font-bold text-gray-900">How to Use</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Close"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>
        </div>

        {/* Modal Content */}
        <div className="p-4">
          <div className="space-y-4">
            <div className="bg-blue-50 rounded-lg p-3">
              <h3 className="font-semibold text-blue-900 mb-2">Note Controls</h3>
              <div className="space-y-2 text-sm text-blue-800">
                <div>
                  <span className="font-medium">Single tap note:</span> Show controls
                </div>
                <div>
                  <span className="font-medium">Double tap note:</span> Edit text
                </div>
                <div>
                  <span className="font-medium">Drag note:</span> Move around
                </div>
              </div>
            </div>

            <div className="bg-green-50 rounded-lg p-3">
              <h3 className="font-semibold text-green-900 mb-2">Board Navigation</h3>
              <div className="space-y-2 text-sm text-green-800">
                <div>
                  <span className="font-medium">Single finger drag:</span> Pan board
                </div>
                <div>
                  <span className="font-medium">Two finger pinch:</span> Zoom in/out
                </div>
                <div>
                  <span className="font-medium">Tap empty area:</span> Hide controls
                </div>
              </div>
            </div>

            <div className="bg-purple-50 rounded-lg p-3">
              <h3 className="font-semibold text-purple-900 mb-2">Note Actions</h3>
              <div className="space-y-2 text-sm text-purple-800">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-purple-200 rounded border-2 border-purple-400"></div>
                  <span>Color picker (top-left)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                    <X size={10} className="text-white" />
                  </div>
                  <span>Delete note (top-right)</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                  <span>Resize handle (bottom-right)</span>
                </div>
              </div>
            </div>

            <div className="bg-yellow-50 rounded-lg p-3">
              <h3 className="font-semibold text-yellow-900 mb-2">Tips</h3>
              <div className="space-y-1 text-sm text-yellow-800">
                <div>• Only one note shows controls at a time</div>
                <div>• Use zoom controls in menu for precise scaling</div>
                <div>• Long notes will show guide lines</div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-medium transition-colors"
          >
            Got it!
          </button>
        </div>
      </div>
    </div>
  );
}