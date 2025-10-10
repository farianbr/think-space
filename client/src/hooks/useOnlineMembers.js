import { useEffect, useState } from "react";
import { socket } from "../lib/socket";

/**
 * useOnlineMembers(boardId)
 * - returns { online } where online is array of userIds or user objects if server emits them
 */
export default function useOnlineMembers(boardId) {
  const [online, setOnline] = useState([]);

  useEffect(() => {
    if (!boardId) return;

    function onList({ boardId: b, online: list }) {
      if (b !== boardId) return;
      setOnline(list);
    }
    function onJoined({ boardId: b, user }) {
      if (b !== boardId) return;
      setOnline((prev) => {
        // server may send user object or just id
        const id = user?.id ?? user;
        if (prev.some((p) => (p?.id ?? p) === id)) return prev;
        return [...prev, user];
      });
    }
    function onLeft({ boardId: b, userId }) {
      if (b !== boardId) return;
      setOnline((prev) => prev.filter((p) => (p?.id ?? p) !== userId));
    }

    socket.on("presence:list", onList);
    socket.on("presence:joined", onJoined);
    socket.on("presence:left", onLeft);

    socket.emit("presence:request", { boardId });

    return () => {
      socket.off("presence:list", onList);
      socket.off("presence:joined", onJoined);
      socket.off("presence:left", onLeft);
    };
  }, [boardId]);

  return { online };
}
