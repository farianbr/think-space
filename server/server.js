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
import { keepAliveService } from "./lib/keepAlive.js";

const app = express();
const server = http.createServer(app);

// security + JSON parsing
app.use(helmet());
app.use(
  cors({
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || "https://thinkspace-client.onrender.com"]
      : ["http://localhost:5173", "http://localhost:5174", "http://192.168.0.218:5173"],
    credentials: true,
  })
);
app.use(express.json());

// Health check endpoint for Render
app.get("/api/health", (req, res) => {
  const isKeepAlive = req.headers['user-agent']?.includes('KeepAlive-Service');
  
  if (isKeepAlive) {
    console.log('💓 Keep-alive health check received');
  }
  
  res.status(200).json({ 
    status: "ok", 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// REST routes
app.use("/api", notesRouter);
app.use("/api/auth", authRouter);
app.use("/api/boards", boardsRouter);
app.use("/api/boards", boardMembersRouter);

// Socket.io setup
const io = new Server(server, {
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? [process.env.FRONTEND_URL || "https://thinkspace-client.onrender.com"]
      : ["http://localhost:5173", "http://localhost:5174", "http://192.168.0.218:5173"],
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
  console.log(`Think Space server running at http://localhost:${PORT}`);
  
  // Start keep-alive service for production (Render free tier)
  keepAliveService.start();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('🔄 SIGTERM received, shutting down gracefully...');
  keepAliveService.stop();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('🔄 SIGINT received, shutting down gracefully...');
  keepAliveService.stop();
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});
