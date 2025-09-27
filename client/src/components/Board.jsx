import { useEffect, useState } from "react";
import { Stage, Layer, Rect, Text } from "react-konva";
import { useQuery } from "@tanstack/react-query";
import { fetchNotes } from "../lib/api";
import { socket } from "../lib/socket";

const BOARD_ID = "demo"; // hardcoded for now

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
              onDragEnd={(e) => handleDragEnd(note.id, e)}
            />
          ))}
        </Layer>
      </Stage>
    </div>
  );
}

function Note({ note, onDragEnd }) {
  return (
    <>
      <Rect
        x={note.x}
        y={note.y}
        width={120}
        height={80}
        fill={note.color || "yellow"}
        stroke="black"
        strokeWidth={1}
        draggable
        onDragEnd={onDragEnd}
      />
      <Text
        text={note.text}
        x={note.x + 8}
        y={note.y + 8}
        fontSize={14}
        width={100}
        height={60}
      />
    </>
  );
}
