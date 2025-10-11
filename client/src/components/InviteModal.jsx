import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "react-hot-toast";
import { X, Mail, Send } from "lucide-react";
import { api } from "../lib/api";

export default function InviteModal({ isOpen, onClose, boardId }) {
  const [email, setEmail] = useState("");
  const qc = useQueryClient();

  const inviteMutation = useMutation({
    mutationFn: async ({ email }) => {
      // POST /api/boards/:boardId/members/invite
      const res = await api.post(`/boards/${boardId}/members/invite`, { email });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Invitation sent! 📧");
      qc.invalidateQueries({ queryKey: ["boardMembers", boardId] });
      setEmail("");
      onClose();
    },
    onError: (err) => {
      const errorMsg = err.response?.data?.error || "Failed to send invitation";
      toast.error(errorMsg);
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    inviteMutation.mutate({ email: email.trim() });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        {/* Modal Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                <Mail size={20} />
                Invite Team Member
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                Send an invitation to collaborate on this board
              </p>
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
        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="colleague@company.com"
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-base"
              style={{ fontSize: "16px" }} // Prevent zoom on iOS
              disabled={inviteMutation.isPending}
              required
            />
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors"
              disabled={inviteMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={inviteMutation.isPending || !email.trim()}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg font-medium transition-colors flex items-center space-x-2"
            >
              {inviteMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Send size={16} />
                  <span>Send Invite</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}