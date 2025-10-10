import { useEffect, useRef, useState } from "react";
import { Stage, Layer } from "react-konva";
import { useQuery } from "@tanstack/react-query";
import { toast } from "react-hot-toast";

import { fetchNotes } from "../lib/api";
import { socket, setSocketAuthFromStorage } from "../lib/socket";
import Note from "../components/Note";
import InviteMemberForm from "../components/InviteMemberForm";
import MembersList from "../components/MembersList";
import useMembersSocket from "../hooks/useMembersSocket";
import ActiveUsers from "../components/ActiveUsers";
import useOnlineMembers from "../hooks/useOnlineMembers";
import { useParams } from "react-router-dom";

export default function BoardPage() {
  const { boardId: BOARD_ID } = useParams();
  const { data: notes = [] } = useQuery({
    queryKey: ["notes", BOARD_ID],
    queryFn: () => fetchNotes(BOARD_ID),
  });
  const stageRef = useRef(null);
  const [localNotes, setLocalNotes] = useState([]);

  // Socket.io connection for live board member updates
  useMembersSocket(BOARD_ID);

  // Merge snapshot + live updates
  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  // Socket.io connection for live notes updates
  useEffect(() => {
    setSocketAuthFromStorage();
    socket.connect();

    socket.on("connect_error", (err) => {
      console.error("Socket connect_error:", err?.message);
      if (err?.message === "AUTH_MISSING" || err?.message === "AUTH_INVALID") {
        toast.error("Please sign in to continue");
      }
    });

    socket.emit("board:join", BOARD_ID, (ack) => {
      if (ack?.ok) {
        setLocalNotes(ack.notes);
      } else {
        console.warn("board:join failed::", ack);
      }
    });

    socket.on("note:created", ({ note }) => {
      setLocalNotes((prev) => [...prev, note]);
    });

    socket.on("note:updated", ({ note }) => {
      setLocalNotes((prev) => prev.map((n) => (n.id === note.id ? note : n)));
    });

    socket.on("note:deleted", ({ noteId }) => {
      setLocalNotes((prev) => prev.filter((n) => n.id !== noteId));
    });

    return () => {
      socket.emit("board:leave", BOARD_ID);
    };
  }, [BOARD_ID]);

  const addNote = () => {
    socket.emit(
      "note:create",
      BOARD_ID,
      { text: "New note", x: 100, y: 100 },
      (ack) => {
        if (!ack.ok) toast.error("Failed to create note");
      }
    );
  };

  const handleDragEnd = (id, e) => {
    socket.emit("note:update", BOARD_ID, id, {
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  // Live presence
  const { online } = useOnlineMembers(BOARD_ID);

  return (
    <div className="flex flex-col items-center">
      <aside className="w-80">
        <h3 className="p-3 font-semibold">Members</h3>
        <MembersList boardId={BOARD_ID} />
        <h3 className="p-3 font-semibold">Active</h3>
        <ActiveUsers activeList={online} />
        <InviteMemberForm boardId={BOARD_ID} />
      </aside>
      <button
        onClick={addNote}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Add Note
      </button>

      <div
        id="board-container"
        className="flex-1 relative bg-white border rounded"
        style={{ minHeight: 600 }}
      >
        <Stage
          ref={stageRef}
          width={800}
          height={600}
          className="border border-gray-400"
        >
          <Layer>
            {localNotes.map((note) => (
              <Note
                key={note.id}
                note={note}
                boardId={BOARD_ID}
                onDragEnd={(e) => handleDragEnd(note.id, e)}
              />
            ))}
          </Layer>
        </Stage>
      </div>
    </div>
  );
}
