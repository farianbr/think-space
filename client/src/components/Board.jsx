import { useEffect, useState } from "react";
import { Stage, Layer } from "react-konva";
import { useQuery } from "@tanstack/react-query";
import { fetchNotes } from "../lib/api";
import { socket } from "../lib/socket";
import Note from "./Note";

const BOARD_ID = "demo-board"; // hardcoded for now

export default function Board() {
  const { data: notes = [] } = useQuery({
    queryKey: ["notes", BOARD_ID],
    queryFn: () => fetchNotes(BOARD_ID),
  });

  const [localNotes, setLocalNotes] = useState([]);

  // Merge snapshot + live updates
  useEffect(() => {
    setLocalNotes(notes);
  }, [notes]);

  // Socket.io connection for live notes updates
  useEffect(() => {
    socket.connect();

    socket.emit("board:join", BOARD_ID, (ack) => {
      if (ack?.ok) {
        setLocalNotes(ack.notes);
      }
    });

    socket.on("note:created", ({ note }) => {
      setLocalNotes((prev) => [...prev, note]);
    });

    socket.on("note:updated", ({ note }) => {
      setLocalNotes((prev) =>
        prev.map((n) => (n.id === note.id ? note : n))
      );
    });

    socket.on("note:deleted", ({ noteId }) => {
      setLocalNotes((prev) => prev.filter((n) => n.id !== noteId));
    });

    return () => {
      socket.emit("board:leave", BOARD_ID);
      socket.disconnect();
    };
  }, []);

  const addNote = () => {
    socket.emit("note:create", BOARD_ID, { text: "New note", x: 100, y: 100 });
  };

  const handleDragEnd = (id, e) => {
    socket.emit("note:update", BOARD_ID, id, {
      x: e.target.x(),
      y: e.target.y(),
    });
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={addNote}
        className="mb-4 px-4 py-2 bg-blue-500 text-white rounded"
      >
        Add Note
      </button>

      <Stage width={800} height={600} className="border border-gray-400">
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
  );
}