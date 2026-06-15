import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { socket } from "../lib/socket";

/**
 * Boards for the current user, scoped by library filter.
 * filter: "all" | "owned" | "shared" | "favorites" | "archived"
 * Query key: ['myBoards', filter]
 */
export function useMyBoards(filter = "all") {
  return useQuery({
    queryKey: ["myBoards", filter],
    queryFn: async () => {
      const res = await api.get("/boards/my", { params: { filter } });
      return res.data.boards;
    },
    staleTime: 1000 * 20,
    refetchOnWindowFocus: false,
  });
}

/** Create a new board. Invalidates every board list. */
export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/boards", payload);
      return res.data.board;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["myBoards"] }),
  });
}

/** Patch a board (rename / description / archive / restore). Owner only. */
export function useUpdateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, ...patch }) => {
      const res = await api.patch(`/boards/${boardId}`, patch);
      return res.data.board;
    },
    onSuccess: (board) => {
      qc.invalidateQueries({ queryKey: ["myBoards"] });
      if (board?.id) qc.invalidateQueries({ queryKey: ["board", board.id] });
    },
  });
}

/** Delete a board (owner only). */
export function useDeleteBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (boardId) => {
      await api.delete(`/boards/${boardId}`);
      return boardId;
    },
    onSuccess: (boardId) => {
      qc.invalidateQueries({ queryKey: ["myBoards"] });
      qc.removeQueries({ queryKey: ["board", boardId] });
    },
  });
}

/**
 * Toggle a board star with optimistic update across all cached board lists.
 */
export function useToggleStar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ boardId, isStarred }) => {
      if (isStarred) await api.delete(`/boards/${boardId}/star`);
      else await api.post(`/boards/${boardId}/star`);
      return { boardId, isStarred: !isStarred };
    },
    onMutate: async ({ boardId, isStarred }) => {
      await qc.cancelQueries({ queryKey: ["myBoards"] });
      const snapshots = qc.getQueriesData({ queryKey: ["myBoards"] });
      for (const [key, data] of snapshots) {
        if (!Array.isArray(data)) continue;
        qc.setQueryData(
          key,
          data.map((b) => (b.id === boardId ? { ...b, isStarred: !isStarred } : b))
        );
      }
      return { snapshots };
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["myBoards"] }),
  });
}

/**
 * Listen for boards-related socket events and keep caches fresh.
 * Returns a `setup()` to call inside an effect.
 */
export function useBoardsSocket() {
  const qc = useQueryClient();

  const setup = () => {
    const refresh = () => qc.invalidateQueries({ queryKey: ["myBoards"] });

    function onBoardDeleted({ boardId }) {
      const lists = qc.getQueriesData({ queryKey: ["myBoards"] });
      for (const [key, data] of lists) {
        if (Array.isArray(data))
          qc.setQueryData(
            key,
            data.filter((b) => b.id !== boardId)
          );
      }
    }

    socket.on("board:deleted", onBoardDeleted);
    socket.on("board:added", refresh);
    socket.on("board:updated", refresh);

    return () => {
      socket.off("board:deleted", onBoardDeleted);
      socket.off("board:added", refresh);
      socket.off("board:updated", refresh);
    };
  };

  return { setup };
}
