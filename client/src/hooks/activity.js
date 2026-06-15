import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { socket } from "../lib/socket";

/** Workspace-wide activity feed (dashboard). */
export function useWorkspaceActivity(limit = 20) {
  return useQuery({
    queryKey: ["activity", "workspace", limit],
    queryFn: async () => {
      const res = await api.get("/activity", { params: { limit } });
      return res.data.activities;
    },
    staleTime: 1000 * 30,
  });
}

/** Activity for a single board (board activity panel), live-updating. */
export function useBoardActivity(boardId, limit = 40) {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["activity", "board", boardId, limit],
    queryFn: async () => {
      const res = await api.get(`/boards/${boardId}/activity`, { params: { limit } });
      return res.data.activities;
    },
    enabled: !!boardId,
    staleTime: 1000 * 15,
  });

  useEffect(() => {
    if (!boardId) return;
    function onNew({ boardId: b, activity }) {
      if (b !== boardId) return;
      qc.setQueryData(["activity", "board", boardId, limit], (old = []) =>
        [activity, ...(Array.isArray(old) ? old : [])].slice(0, limit)
      );
    }
    socket.on("activity:new", onNew);
    return () => socket.off("activity:new", onNew);
  }, [boardId, limit, qc]);

  return query;
}
