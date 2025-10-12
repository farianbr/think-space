import { io } from "socket.io-client";
import { getToken } from "./auth";

export const socket = io(import.meta.env.VITE_API_URL?.replace('/api', '') || "http://192.168.0.218:4000", {
  withCredentials: true,
  autoConnect: false,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 500,
  transports: ["polling", "websocket"],
  auth: {
    token: getToken() || "", // will be refreshed on connect
  },
});

// helper to refresh auth on the socket (e.g., after login/logout)
export function setSocketAuthFromStorage() {
  socket.auth = { token: getToken() || "" };
}

// connect when app starts (or after login)
export function connectSocket() {
  // ALWAYS refresh auth before connecting to avoid stale or missing token
  setSocketAuthFromStorage();
  if (!socket.connected) {
    socket.connect();
  } else {
    // If already connected but auth changed, reconnect with new auth
    const currentToken = getToken();
    if (socket.auth?.token !== currentToken) {
      socket.disconnect();
      setSocketAuthFromStorage();
      socket.connect();
    }
  }
}

// Force reconnect with fresh auth (useful after login)
export function reconnectSocket() {
  setSocketAuthFromStorage();
  if (socket.connected) {
    socket.disconnect();
  }
  socket.connect();
}