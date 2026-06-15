import {
  addVoice,
  removeVoice,
  setVoiceState,
  getVoicePeers,
  removeVoiceEverywhere,
} from "../lib/voiceRoom.js";

/**
 * WebRTC signaling for the board voice room. The server is a pure relay: it
 * tracks who's in the room and forwards SDP/ICE between peers, which form a P2P
 * mesh. Requires the caller to have joined the board room first.
 */
export function registerVoiceSocket(io, socket) {
  const room = (id) => `room:board:${id}`;
  const joined = (id) => socket.rooms.has(room(id));

  socket.on("voice:join", (boardId, ack) => {
    if (!joined(boardId)) return ack?.({ ok: false, status: 403, message: "Not joined" });
    const user = socket.user ? { id: socket.user.id, name: socket.user.name } : null;

    // Snapshot existing peers BEFORE adding self, so the newcomer initiates the
    // offers (and existing peers answer) — avoids offer glare.
    const peers = getVoicePeers(boardId, socket.id);
    addVoice(boardId, socket.id, user);

    socket.to(room(boardId)).emit("voice:peer_joined", { socketId: socket.id, user });
    ack?.({ ok: true, peers });
  });

  socket.on("voice:leave", (boardId) => {
    removeVoice(boardId, socket.id);
    socket.to(room(boardId)).emit("voice:peer_left", { socketId: socket.id });
  });

  // Relay an SDP offer/answer or ICE candidate to a specific peer socket.
  socket.on("voice:signal", (boardId, toSocketId, data) => {
    if (!joined(boardId) || !toSocketId) return;
    io.to(toSocketId).emit("voice:signal", { from: socket.id, data });
  });

  socket.on("voice:state", (boardId, payload) => {
    const muted = !!payload?.muted;
    setVoiceState(boardId, socket.id, muted);
    socket.to(room(boardId)).emit("voice:peer_state", { socketId: socket.id, muted });
  });

  socket.on("disconnecting", () => {
    for (const boardId of removeVoiceEverywhere(socket.id)) {
      socket.to(room(boardId)).emit("voice:peer_left", { socketId: socket.id });
    }
  });
}
