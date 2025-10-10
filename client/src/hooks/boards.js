import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "../lib/api";
import { socket } from "../lib/socket";

/**
 * Fetch current user's boards (owned OR member)
 * Query key: ['myBoards']
 */
export function useMyBoards() {
  return useQuery({
    queryKey: ["myBoards"],
    queryFn: async () => {
      const res = await api.get("/boards/my");
      return res.data.boards;
    },
    staleTime: 1000 * 30,
    refetchOnWindowFocus: false,
  });
}

/**
 * Create a new board
 * - invalidates ['myBoards'] on success
 */
export function useCreateBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload) => {
      const res = await api.post("/boards", payload);
      return res.data.board;
    },
    onSuccess: (board) => {
      // optimistic approach: refetch list
      qc.invalidateQueries({ queryKey: ["myBoards"] });
      // optionally navigate to newly created board; the app should handle that after mutation returns
    },
  });
}

/**
 * Delete a board (owner only)
 * - invalidates ['myBoards'] on success
 * - also emits handled server-side (board:deleted) which other clients will receive
 */
export function useDeleteBoard() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (boardId) => {
      await api.delete(`/boards/${boardId}`);
      return boardId;
    },
    onSuccess: (boardId) => {
      qc.invalidateQueries({ queryKey: ["myBoards"] });
      // Also remove any active board cache if you have one: e.g., ['board', boardId]
      qc.removeQueries({ queryKey: ["board", boardId] });
    },
  });
}

/**
 * Hook to listen for boards-related socket events and update cache.
 * Currently listens to 'board:deleted' and removes board from ['myBoards'] cache.
 */
export function useBoardsSocket() {
  const qc = useQueryClient();

  // NOTE: keep listeners idempotent; returned cleanup handles removing them

  const setup = () => {
    function onBoardDeleted({ boardId }) {
      qc.setQueryData(["myBoards"], (old = []) =>
        old.filter((b) => b.id !== boardId)
      );
    }

    function onBoardAdded(payload) {
      // simple: refetch myBoards to pick up the new board
      qc.invalidateQueries({ queryKey: ["myBoards"] });
    }

    socket.on("board:deleted", onBoardDeleted);
    socket.on("board:added", onBoardAdded);

    return () => {
      socket.off("board:deleted", onBoardDeleted);
      socket.off("board:added", onBoardAdded);
    };
  };

  // Return a setup function so consumers can call inside useEffect
  return { setup };
}
