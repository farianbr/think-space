import { useCallback, useEffect, useRef, useState } from "react";
import { socket } from "../lib/socket";

// Public STUN by default. Restrictive/symmetric NATs need a TURN server: set
// VITE_TURN_URL (+ optional VITE_TURN_USERNAME / VITE_TURN_CREDENTIAL) and it
// gets appended to the ICE servers below.
const ICE_CONFIG = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" },
    ...(import.meta.env.VITE_TURN_URL
      ? [
          {
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USERNAME || undefined,
            credential: import.meta.env.VITE_TURN_CREDENTIAL || undefined,
          },
        ]
      : []),
  ],
};

/**
 * Manages a P2P WebRTC voice mesh for a board, driven by the server's signaling
 * relay (see server/sockets/voiceSocket.js). Returns connection state plus
 * join/leave/mute controls. Each remote peer gets its own RTCPeerConnection and
 * a hidden <audio> sink.
 */
export default function useVoiceRoom(boardId) {
  const [joined, setJoined] = useState(false);
  const [joining, setJoining] = useState(false);
  const [muted, setMuted] = useState(false);
  const [participants, setParticipants] = useState([]); // { socketId, user, muted }
  const [error, setError] = useState(null);

  const localStreamRef = useRef(null);
  const pcsRef = useRef(new Map()); // socketId -> RTCPeerConnection
  const pendingRef = useRef(new Map()); // socketId -> [RTCIceCandidate]
  const audioRef = useRef(new Map()); // socketId -> HTMLAudioElement
  const joinedRef = useRef(false);

  const upsertParticipant = useCallback((p) => {
    setParticipants((prev) => {
      const i = prev.findIndex((x) => x.socketId === p.socketId);
      if (i === -1) return [...prev, p];
      const next = [...prev];
      next[i] = { ...next[i], ...p };
      return next;
    });
  }, []);

  const closePeer = useCallback((socketId) => {
    const pc = pcsRef.current.get(socketId);
    if (pc) {
      pc.onicecandidate = null;
      pc.ontrack = null;
      pc.close();
      pcsRef.current.delete(socketId);
    }
    const audio = audioRef.current.get(socketId);
    if (audio) {
      audio.srcObject = null;
      audioRef.current.delete(socketId);
    }
    pendingRef.current.delete(socketId);
    setParticipants((prev) => prev.filter((x) => x.socketId !== socketId));
  }, []);

  const createPeer = useCallback(
    (socketId, user) => {
      let pc = pcsRef.current.get(socketId);
      if (pc) return pc;

      pc = new RTCPeerConnection(ICE_CONFIG);
      const stream = localStreamRef.current;
      if (stream) stream.getTracks().forEach((t) => pc.addTrack(t, stream));

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit("voice:signal", boardId, socketId, { candidate: e.candidate });
        }
      };
      pc.ontrack = (e) => {
        let audio = audioRef.current.get(socketId);
        if (!audio) {
          audio = new Audio();
          audio.autoplay = true;
          audioRef.current.set(socketId, audio);
        }
        audio.srcObject = e.streams[0];
        audio.play?.().catch(() => {});
      };

      pcsRef.current.set(socketId, pc);
      if (user) upsertParticipant({ socketId, user, muted: false });
      return pc;
    },
    [boardId, upsertParticipant]
  );

  // Signaling listeners.
  useEffect(() => {
    if (!boardId) return;

    const flushPending = async (socketId, pc) => {
      const queued = pendingRef.current.get(socketId);
      if (!queued) return;
      for (const c of queued) {
        try {
          await pc.addIceCandidate(c);
        } catch {
          /* ignore */
        }
      }
      pendingRef.current.delete(socketId);
    };

    const onPeerJoined = ({ socketId, user }) => {
      // Existing member: register the newcomer and wait for their offer.
      upsertParticipant({ socketId, user, muted: false });
    };
    const onPeerLeft = ({ socketId }) => closePeer(socketId);
    const onPeerState = ({ socketId, muted: m }) => upsertParticipant({ socketId, muted: m });

    const onSignal = async ({ from, data }) => {
      if (!joinedRef.current) return;
      const pc = pcsRef.current.get(from) || createPeer(from);
      try {
        if (data.sdp) {
          await pc.setRemoteDescription(data.sdp);
          await flushPending(from, pc);
          if (data.sdp.type === "offer") {
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            socket.emit("voice:signal", boardId, from, { sdp: pc.localDescription });
          }
        } else if (data.candidate) {
          if (pc.remoteDescription && pc.remoteDescription.type) {
            await pc.addIceCandidate(data.candidate);
          } else {
            const q = pendingRef.current.get(from) || [];
            q.push(data.candidate);
            pendingRef.current.set(from, q);
          }
        }
      } catch (err) {
        console.debug("voice signal error", err);
      }
    };

    socket.on("voice:peer_joined", onPeerJoined);
    socket.on("voice:peer_left", onPeerLeft);
    socket.on("voice:peer_state", onPeerState);
    socket.on("voice:signal", onSignal);
    return () => {
      socket.off("voice:peer_joined", onPeerJoined);
      socket.off("voice:peer_left", onPeerLeft);
      socket.off("voice:peer_state", onPeerState);
      socket.off("voice:signal", onSignal);
    };
  }, [boardId, createPeer, closePeer, upsertParticipant]);

  const join = useCallback(async () => {
    if (joinedRef.current || joining) return;
    setJoining(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;

      socket.emit("voice:join", boardId, async (res) => {
        if (!res?.ok) {
          setError(res?.message || "Could not join voice room");
          stream.getTracks().forEach((t) => t.stop());
          localStreamRef.current = null;
          setJoining(false);
          return;
        }
        joinedRef.current = true;
        setJoined(true);
        setJoining(false);

        // We're the newcomer: initiate an offer to each existing peer.
        for (const peer of res.peers || []) {
          upsertParticipant({ socketId: peer.socketId, user: peer.user, muted: peer.muted });
          const pc = createPeer(peer.socketId, peer.user);
          try {
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);
            socket.emit("voice:signal", boardId, peer.socketId, { sdp: pc.localDescription });
          } catch (err) {
            console.debug("voice offer error", err);
          }
        }
      });
    } catch {
      setError("Microphone access denied");
      setJoining(false);
    }
  }, [boardId, joining, createPeer, upsertParticipant]);

  const leave = useCallback(() => {
    if (!joinedRef.current) return;
    socket.emit("voice:leave", boardId);
    for (const id of [...pcsRef.current.keys()]) closePeer(id);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    joinedRef.current = false;
    setJoined(false);
    setParticipants([]);
    setMuted(false);
  }, [boardId, closePeer]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => (t.enabled = !next));
    setMuted(next);
    socket.emit("voice:state", boardId, { muted: next });
  }, [boardId, muted]);

  // Tear down on unmount / board change.
  useEffect(() => {
    return () => {
      if (joinedRef.current) leave();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  return { joined, joining, muted, participants, error, join, leave, toggleMute };
}
