import { useState, useEffect, useMemo } from "react";
import { Rect, Text } from "react-konva";
import { Html } from "react-konva-utils";
import { socket } from "../lib/socket";

const PALETTE = ["#fde047", "#fca5a5", "#86efac", "#93c5fd", "#f5d0fe"]; // yellow/red/green/blue/pink

export default function Note({ note, boardId, onDragEnd }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(note.text);
  const [showPalette, setShowPalette] = useState(false);

  // keep local text synced with server pushes
  useEffect(() => {
    setValue(note.text);
  }, [note.text]);

  const pos = useMemo(() => ({ x: note.x, y: note.y }), [note.x, note.y]);

  function startEdit() {
    setShowPalette(false);
    setIsEditing(true);
  }

  function finishEdit() {
    setIsEditing(false);
    const next = value.trim();
    if (next !== note.text) {
      socket.emit("note:update", boardId, note.id, { text: next });
    }
  }

  function handleDelete() {
    socket.emit("note:delete", boardId, note.id);
  }

  function togglePalette() {
    setShowPalette((s) => !s);
  }

  function applyColor(color) {
    socket.emit("note:update", boardId, note.id, { color });
    setShowPalette(false);
  }

  return (
    <>
      {/* Sticky background */}
      <Rect
        x={pos.x}
        y={pos.y}
        width={120}
        height={80}
        fill={note.color || "#fde047"} // default yellow-300
        stroke="black"
        strokeWidth={1}
        cornerRadius={6}
        draggable={!isEditing}           
        onDragEnd={onDragEnd}
        onDblClick={startEdit}
      />

      {/* Text (view mode) */}
      {!isEditing && (
        <Text
          text={note.text}
          x={pos.x + 8}
          y={pos.y + 8}
          fontSize={14}
          width={100}
          height={60}
          onDblClick={startEdit}
          draggable={!isEditing}
          onDragEnd={onDragEnd}
        />
      )}

      {/* Edit mode: DOM input anchored in canvas space */}
      {isEditing && (
        <Html groupProps={{ x: pos.x + 8, y: pos.y + 8 }} divProps={{ className: "w-[104px]" }}>
          <input
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={finishEdit}
            onKeyDown={(e) => e.key === "Enter" && finishEdit()}
            className="w-full rounded border border-gray-400 bg-white px-2 py-1 text-sm outline-none"
          />
        </Html>
      )}

      {/* Delete button (×) */}
      <Html groupProps={{ x: pos.x + 120 - 16, y: pos.y - 8 }}>
        <button
          onClick={handleDelete}
          title="Delete"
          className="flex h-4 w-4 items-center justify-center rounded-full border border-gray-400 bg-white text-[12px] leading-4 hover:bg-gray-50"
        >
          ×
        </button>
      </Html>

      {/* Color dot & palette */}
      <Html groupProps={{ x: pos.x - 10, y: pos.y - 8 }}>
        <button
          onClick={togglePalette}
          title="Change color"
          className="h-4 w-4 rounded-full border border-gray-400"
          style={{ background: note.color || "#fde047" }}
        />
      </Html>

      {showPalette && (
        <Html groupProps={{ x: pos.x - 6, y: pos.y - 34 }}>
          <div className="flex gap-1.5 rounded border border-gray-400 bg-white p-1.5 shadow-md" onClick={(e) => e.stopPropagation()}>
            {PALETTE.map((c) => (
              <button
                key={c}
                onClick={() => applyColor(c)}
                className="h-4 w-4 rounded-full border border-gray-400"
                style={{ background: c }}
                title={c}
              />
            ))}
          </div>
        </Html>
      )}
    </>
  );
}
