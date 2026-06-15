// In-memory registry of voice-room participants per board, keyed by socket id.
// Voice is ephemeral, so this never needs persistence. Single-node only — a
// multi-node deployment would move this into the socket.io adapter / Redis.
const rooms = new Map(); // boardId -> Map(socketId -> { user, muted })

export function addVoice(boardId, socketId, user) {
  if (!rooms.has(boardId)) rooms.set(boardId, new Map());
  rooms.get(boardId).set(socketId, { user, muted: false });
}

export function removeVoice(boardId, socketId) {
  const r = rooms.get(boardId);
  if (!r) return;
  r.delete(socketId);
  if (r.size === 0) rooms.delete(boardId);
}

export function setVoiceState(boardId, socketId, muted) {
  const p = rooms.get(boardId)?.get(socketId);
  if (p) p.muted = muted;
}

/** Existing participants in a board's voice room, excluding one socket. */
export function getVoicePeers(boardId, exceptSocketId) {
  const r = rooms.get(boardId);
  if (!r) return [];
  return [...r.entries()]
    .filter(([id]) => id !== exceptSocketId)
    .map(([socketId, v]) => ({ socketId, user: v.user, muted: v.muted }));
}

/** Remove a socket from every voice room (on disconnect); returns affected boardIds. */
export function removeVoiceEverywhere(socketId) {
  const affected = [];
  for (const [boardId, r] of rooms.entries()) {
    if (r.delete(socketId)) {
      affected.push(boardId);
      if (r.size === 0) rooms.delete(boardId);
    }
  }
  return affected;
}
