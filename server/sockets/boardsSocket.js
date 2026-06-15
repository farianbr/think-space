import { prisma } from "../prismaClient.js";
import { getNotesSnapshot } from "../controllers/notesController.js";
import { addOnline, getOnline, removeOnline } from "../lib/online.js";
import { getUserBoardRole, userCanAccessBoard } from "../lib/boardAccess.js";

export function registerBoardsSocket(io, socket) {
  // Per-socket cache of the user's role on each joined board, so hot-path note
  // handlers can authorize without a DB round-trip per event. Refreshed on join
  // and kept in sync by setSocketBoardRole when roles change (see members ctrl).
  if (!socket.data.boardRoles) socket.data.boardRoles = {};

  socket.on("board:join", async (boardId, ack) => {
    try {
      if (!boardId || typeof boardId !== "string")
        throw new Error("Invalid boardId");

      const userId = socket.user?.id;
      if (!userId)
        return ack?.({ ok: false, status: 401, message: "Unauthorized" });

      const role = await getUserBoardRole(boardId, userId);
      if (!role)
        return ack?.({ ok: false, status: 403, message: "Forbidden" });

      socket.data.boardRoles[boardId] = role;
      socket.join(boardRoom(boardId));

      // mark online
      if (userId) {
        // fetch latest user info to store
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, name: true, email: true },
        });

        const userObj = { id: user.id, name: user.name, email: user.email };

        // add to online map as user object
        addOnline(boardId, userObj);

        // emit join + updated list
        io.to(boardRoom(boardId)).emit("presence:joined", {
          boardId,
          user: userObj,
        });
        io.to(boardRoom(boardId)).emit("presence:list", {
          boardId,
          online: getOnline(boardId),
        });
      }

      const snapshot = await getNotesSnapshot(boardId);
      ack?.({ ok: true, boardId, notes: snapshot, role });
    } catch (err) {
      console.error("board:join error", err);
      ack?.({ ok: false, message: err.message });
    }
  });

  socket.on("board:leave", async (boardId) => {
    if (boardId && typeof boardId === "string") {
      socket.leave(boardRoom(boardId));
      if (socket.data.boardRoles) delete socket.data.boardRoles[boardId];
      const userId = socket.user?.id;
      if (userId) {
        removeOnline(boardId, userId);
        io.to(boardRoom(boardId)).emit("presence:left", { boardId, userId });
        io.to(boardRoom(boardId)).emit("presence:list", {
          boardId,
          online: getOnline(boardId),
        });
      }
    }
  });

  socket.on("presence:request", async ({ boardId }, ack) => {
    try {
      const userId = socket.user?.id;
      if (!(await userCanAccessBoard(boardId, userId)))
        return ack?.({ ok: false, status: 403, message: "Forbidden" });

      const onlineList = getOnline(boardId);
      io.to(socket.id).emit("presence:list", { boardId, online: onlineList });
      ack?.({ ok: true });
    } catch (err) {
      console.error("presence:request error", err);
      ack?.({ ok: false, message: err.message });
    }
  });

  socket.on("disconnecting", () => {
    // When a socket disconnects, remove them from all boards they were in
    const userId = socket.user?.id;
    if (!userId) return;

    const rooms = Array.from(socket.rooms || []);
    for (const room of rooms) {
      if (!room.startsWith("room:board:")) continue;
      const boardId = room.replace("room:board:", "");
      removeOnline(boardId, userId);
      io.to(room).emit("presence:left", { boardId, userId });
      io.to(room).emit("presence:list", {
        boardId,
        online: getOnline(boardId),
      });
    }
  });
}

function boardRoom(boardId) {
  return `room:board:${boardId}`;
}
