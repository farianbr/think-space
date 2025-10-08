import { useState } from "react";
import { useAddBoardMember } from "../hooks/members";

export default function InviteMemberForm({ boardId }) {
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState("member");
  const addMutation = useAddBoardMember(boardId);

  const onSubmit = (e) => {
    e.preventDefault();
    if (!userId.trim()) return alert("Enter userId to invite (temporary)");
    addMutation.mutate({ userId: userId.trim(), role });
    setUserId("");
  };

  return (
    <form onSubmit={onSubmit} className="p-4 space-y-2 border rounded">
      <div>
        <label className="block text-sm">User ID (temporary)</label>
        <input
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
          className="mt-1 w-full p-2 border rounded"
          placeholder="paste a userId for now"
        />
        <div className="text-xs text-gray-500 mt-1">
          Future: invite by email. For now provide userId.
        </div>
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
          {addMutation.isLoading ? "Inviting..." : "Invite"}
        </button>
        {addMutation.isError && (
          <div className="text-red-600 mt-2">{addMutation.error?.message}</div>
        )}
        {addMutation.isSuccess && (
          <div className="text-green-600 mt-2">Invited</div>
        )}
      </div>
    </form>
  );
}
