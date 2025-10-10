import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";

import notesRouter from "./routes/notesRoutes.js";
import boardsRouter from "./routes/boardsRoutes.js";
import boardMembersRouter from "./routes/boardMembersRoutes.js";
import authRouter from "./routes/authRoutes.js";
import { socketAuth } from "./middleware/socketAuth.js";
import { setIo } from "./lib/io.js";
import { registerNotesSocket } from "./sockets/notesSocket.js";
import { registerBoardsSocket } from "./sockets/boardsSocket.js";

const app = express();
const server = http.createServer(app);

// security + JSON parsing
app.use(helmet());
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());

// REST routes
app.use("/api", notesRouter);
app.use("/api/auth", authRouter);
app.use("/api/boards", boardsRouter);
app.use("/api/boards", boardMembersRouter);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

// Socket.io authentication
socketAuth(io);

// Global io for controllers
setIo(io);

// Socket.io connection
io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id, "User:", socket.user?.name);

  // join a per-user room so server can notify specific users
  if (socket.user?.id) {
    socket.join(`user:${socket.user.id}`);
  }

  registerBoardsSocket(io, socket);
  registerNotesSocket(io, socket);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id, "User:", socket.user?.name);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`ThinkSpace server running at http://localhost:${PORT}`);
});
