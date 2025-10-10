import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import { useAddBoardMember } from "../hooks/members";
import { api } from "../lib/api";

export default function InviteMemberForm({ boardId }) {
  const [identifier, setIdentifier] = useState(""); // can be email or userId
  const [mode, setMode] = useState("email"); // 'email' or 'userId'
  const [role, setRole] = useState("member");

  const queryClient = useQueryClient();
  const addMutation = useAddBoardMember(boardId);

  // helper: call server invite-by-email endpoint
  const inviteByEmail = async (email) => {
    const res = await api.post(`/boards/${boardId}/members/invite`, {
      email,
      role,
    });
    return res.data;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const id = identifier.trim();
    if (!id) return alert("Enter email or userId");

    try {
      if (mode === "userId") {
        // use existing mutation (it already invalidates onSuccess)
        await addMutation.mutateAsync({ userId: id, role });
        setIdentifier("");
        return;
      }

      // email mode: call invite endpoint, then invalidate members query
      const res = await inviteByEmail(id);
      toast.success(res.message);

      // Invalidate so useBoardMembers refetches and MembersList updates
      await queryClient.invalidateQueries({
        queryKey: ["boardMembers", boardId],
      });

      setIdentifier("");
    } catch (err) {
      // show server message if available
      const msg =
        err?.response?.data?.message || err?.message || "Invite failed";
      toast.error(msg);
    }
  };

  return (
    <form onSubmit={onSubmit} className="p-4 space-y-2 border rounded">
      <div className="flex items-center gap-2">
        <label className="text-sm">Invite by</label>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value)}
          className="p-1 border rounded"
        >
          <option value="email">Email</option>
          <option value="userId">User ID</option>
        </select>
      </div>

      <div>
        <label className="block text-sm">
          {mode === "email" ? "User Email" : "User ID"}
        </label>
        <input
          value={identifier}
          onChange={(e) => setIdentifier(e.target.value)}
          className="mt-1 w-full p-2 border rounded"
          placeholder={mode === "email" ? "user@example.com" : "paste a userId"}
        />
      </div>

      <div>
        <label className="block text-sm">Role</label>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="mt-1 p-2 border rounded"
        >
          <option value="member">member</option>
          <option value="editor">editor</option>
          <option value="viewer">viewer</option>
        </select>
      </div>

      <div>
        <button
          type="submit"
          className="px-3 py-2 bg-blue-600 text-white rounded"
          disabled={addMutation.isLoading}
        >
          {addMutation.isLoading
            ? "Processing..."
            : mode === "email"
            ? "Invite by email"
            : "Add by userId"}
        </button>
      </div>
    </form>
  );
}
