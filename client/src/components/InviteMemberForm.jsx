import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { api } from "../lib/api";

export default function InviteMemberForm({ boardId }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("member");
  const [isLoading, setIsLoading] = useState(false);

  const queryClient = useQueryClient();

  const onSubmit = async (e) => {
    e.preventDefault();
    const emailValue = email.trim();
    if (!emailValue) return toast.error("Please enter an email address");

    setIsLoading(true);
    try {
      const res = await api.post(`/boards/${boardId}/members/invite`, {
        email: emailValue,
        role,
      });
      
      toast.success(res.data.message || "Invitation sent! 📧");

      // Invalidate so useBoardMembers refetches and MembersList updates
      await queryClient.invalidateQueries({
        queryKey: ["boardMembers", boardId],
      });

      setEmail("");
    } catch (err) {
      const msg =
        err?.response?.data?.message || err?.message || "Invite failed";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
      <form onSubmit={onSubmit} className="space-y-4">
        {/* Email Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Address
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="colleague@example.com"
            disabled={isLoading}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 text-sm"
          />
        </div>

        {/* Role Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Role
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            disabled={isLoading}
            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors disabled:bg-gray-100 text-sm"
          >
            <option value="member">Member</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !email.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center"
        >
          {isLoading ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Sending invitation...
            </>
          ) : (
            <>
              <span className="mr-2">📧</span>
              Send Invitation
            </>
          )}
        </button>
      </form>

      {/* Help Text */}
      <div className="mt-3 text-xs text-gray-500 flex items-center">
        <span className="mr-1">💡</span>
        An invitation email will be sent to the recipient
      </div>
    </div>
  );
}
