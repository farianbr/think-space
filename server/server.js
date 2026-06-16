import "./lib/loadEnv.js"; // must run first: loads .env / validates secrets
import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";

import notesRouter from "./routes/notesRoutes.js";
import boardsRouter from "./routes/boardsRoutes.js";
import boardMembersRouter from "./routes/boardMembersRoutes.js";
import authRouter from "./routes/authRoutes.js";
import activityRouter from "./routes/activityRoutes.js";
import notificationsRouter from "./routes/notificationsRoutes.js";
import templatesRouter from "./routes/templatesRoutes.js";
import peopleRouter from "./routes/peopleRoutes.js";
import invitesRouter from "./routes/invitesRoutes.js";
import billingRouter from "./routes/billingRoutes.js";
import { handleStripeWebhook } from "./controllers/billingController.js";
import { socketAuth } from "./middleware/socketAuth.js";
import { setIo } from "./lib/io.js";
import { registerNotesSocket } from "./sockets/notesSocket.js";
import { registerBoardsSocket } from "./sockets/boardsSocket.js";
import { registerCommentsSocket } from "./sockets/commentsSocket.js";
import { registerVoiceSocket } from "./sockets/voiceSocket.js";
import { keepAliveService } from "./lib/keepAlive.js";

const app = express();
const server = http.createServer(app);

// Render (and most PaaS) terminate TLS at a proxy and forward the client IP via
// X-Forwarded-For. Trust the first proxy hop so rate limiting keys on the real
// client IP rather than the proxy.
if (process.env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

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
// Stripe webhook must receive the raw body for signature verification, so it is
// mounted with express.raw BEFORE the global JSON parser.
app.post(
  "/api/billing/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
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
app.use("/api", activityRouter);
app.use("/api", peopleRouter);
app.use("/api/auth", authRouter);
app.use("/api/boards", boardsRouter);
app.use("/api/boards", boardMembersRouter);
app.use("/api/notifications", notificationsRouter);
app.use("/api/invites", invitesRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/billing", billingRouter);

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
  registerCommentsSocket(io, socket);
  registerVoiceSocket(io, socket);

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
