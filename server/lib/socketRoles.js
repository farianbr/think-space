import { getIo } from "./io.js";

/**
 * Keep per-socket cached board roles in sync when a member's role changes or
 * they're removed. Mutates the authoritative local Socket.data and notifies the
 * affected client so its UI affordances update live.
 *
 * Single-node assumption: iterates this process's connected sockets directly.
 * With a multi-node socket.io adapter this would need to broadcast instead.
 *
 * @param {string} userId   the affected user
 * @param {string} boardId  the board whose role changed
 * @param {string|null} role new role, or null when access was revoked
 */
export function syncUserBoardRole(userId, boardId, role) {
  const io = getIo();
  if (!io || !userId || !boardId) return;

  for (const socket of io.sockets.sockets.values()) {
    if (socket.user?.id !== userId) continue;
    if (!socket.data.boardRoles) socket.data.boardRoles = {};

    if (role) {
      socket.data.boardRoles[boardId] = role;
      socket.emit("board:role_changed", { boardId, role });
    } else {
      delete socket.data.boardRoles[boardId];
      socket.leave(`room:board:${boardId}`);
      socket.emit("board:access_revoked", { boardId });
    }
  }
}
