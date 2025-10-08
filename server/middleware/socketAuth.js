// server/middleware/socketAuth.js
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export function socketAuth(io) {
  io.use((socket, next) => {
    try {
      // Prefer auth.token; also allow header if you want
      const token =
        socket.handshake?.auth?.token ||
        socket.handshake?.headers?.authorization?.split(" ")[1];

      if (!token) {
        return next(new Error("AUTH_MISSING"));
      }

      const payload = jwt.verify(token, JWT_SECRET); // throws on invalid/expired
      socket.user = { id: payload.sub };
      return next();
    } catch (err) {
      return next(new Error("AUTH_INVALID"));
    }
  });
}
