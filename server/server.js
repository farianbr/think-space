import express from "express";
import http from "http";
import { Server } from "socket.io";
import cors from "cors";
import helmet from "helmet";
import notesRouter from "./routes/notesRoutes.js";
import { registerNotesSocket } from "./sockets/notesSocket.js";

const app = express();
const server = http.createServer(app);

// security + JSON parsing
app.use(helmet());
app.use(cors({ origin: ["http://localhost:5173"], credentials: true }));
app.use(express.json());

// REST routes (snapshot, later: auth, boards)
app.use("/api", notesRouter);

// Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("User connected:", socket.id);
  registerNotesSocket(io, socket);

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

const PORT = process.env.PORT || 4000;

server.listen(PORT, () => {
  console.log(`ThinkSpace server running at http://localhost:${PORT}`);
});
