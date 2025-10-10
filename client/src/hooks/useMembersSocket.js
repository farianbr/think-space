import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { socket } from "../lib/socket";

export default function useMembersSocket(boardId) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!boardId) return;

    function onMemberAdded(payload) {
      if (payload?.boardId !== boardId) return;
      // optimistic update: append member if not present
      qc.setQueryData(["boardMembers", boardId], (old = []) => {
        const exists = old.some((m) => m.userId === payload.member.userId);
        if (exists) return old;
        return [...old, payload.member];
      });
    }

    function onMemberRemoved(payload) {
      if (payload?.boardId !== boardId) return;
      qc.setQueryData(["boardMembers", boardId], (old = []) =>
        old.filter((m) => m.userId !== payload.userId)
      );
    }

    socket.on("member:added", onMemberAdded);
    socket.on("member:removed", onMemberRemoved);

    return () => {
      socket.off("member:added", onMemberAdded);
      socket.off("member:removed", onMemberRemoved);
    };
  }, [boardId, qc]);
}
