import { io } from "socket.io-client";
import { getToken } from "./auth";

export const socket = io("http://localhost:4000", {
  withCredentials: true,
  autoConnect: false,
  auth: {
    token: getToken() || "",   // send token on first connect
  },
});

// helper to refresh auth on the socket (e.g., after login/logout)
export function setSocketAuthFromStorage() {
  socket.auth = { token: getToken() || "" };
}

// connect when app starts (or after login)
export function connectSocket() {
  if (!socket.connected) socket.connect();
}