import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import notesRouter from "./routes/notesRoutes.js";
import { registerNotesSocket } from "./sockets/notesSocket.js";
import authRouter from "./routes/authRoutes.js";
import { socketAuth } from "./middleware/socketAuth.js";

const app = express();
const server = http.createServer(app);

// security + JSON parsing
app.use(helmet());
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());

// REST routes 
app.use("/api", notesRouter);
app.use("/api/auth", authRouter);


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

io.on("connection", (socket) => {
  console.log("Socket connected:", socket.id, "User:", socket.user?.id);
  registerNotesSocket(io, socket);

  socket.on("disconnect", () => {
    console.log("Socket disconnected:", socket.id, "User:", socket.user?.id);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`ThinkSpace server running at http://localhost:${PORT}`);
});
