import { useState, useEffect, useRef } from "react";
import { Rect, Text, Group, Circle, Path } from "react-konva";
import { Html } from "react-konva-utils";
import { socket } from "../lib/socket";

const PALETTE = [
  { color: "#fef3c7", name: "Warm Yellow" },
  { color: "#fecaca", name: "Soft Red" },
  { color: "#bbf7d0", name: "Fresh Green" },
  { color: "#bfdbfe", name: "Sky Blue" },
  { color: "#f3e8ff", name: "Lavender" },
  { color: "#fed7aa", name: "Peach" },
  { color: "#e0e7ff", name: "Periwinkle" },
  { color: "#fce7f3", name: "Pink" },
];

import { throttle } from "../lib/throttle";

export default function Note({ note, boardId, onDragStart, onDragEnd }) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(note.text);
  const [showPalette, setShowPalette] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [noteSize, setNoteSize] = useState({
    width: note.width || 140,
    height: note.height || 90,
  });

  // Refs for managing state and positions
  const groupRef = useRef();
  const resizeHandleRef = useRef();
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const initialResizeData = useRef(null);

  const lastEmittedSizeRef = useRef({
    width: note.width || 140,
    height: note.height || 90,
  });

  // keep local text synced with server pushes
  useEffect(() => {
    setValue(note.text);
  }, [note.text]);

  // Sync size changes with safety checks
  useEffect(() => {
    // If we're actively resizing, ignore server echoes to avoid jitter
    if (isResizingRef.current) return;

    if (note.width && note.height) {
      const newSize = { width: note.width, height: note.height };
      setNoteSize(newSize);
      lastEmittedSizeRef.current = newSize;
    }
  }, [note.width, note.height]);

  // Safety cleanup on unmount
  useEffect(() => {
    return () => {
      isResizingRef.current = false;
      isDraggingRef.current = false;
    };
  }, []);

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

  function applyColor(colorObj) {
    socket.emit("note:update", boardId, note.id, { color: colorObj.color });
    setShowPalette(false);
  }

  function handleDragStart(e) {
    // Only start drag if we're not currently resizing
    if (isResizingRef.current) {
      e.cancelBubble = true;
      return;
    }

    isDraggingRef.current = true;
    setIsDragging(true);
    setShowPalette(false);

    if (onDragStart) onDragStart();
  }

  function handleDragEnd(e) {
    isDraggingRef.current = false;
    setIsDragging(false);

    // Only emit drag end if we weren't resizing
    if (!isResizingRef.current && onDragEnd) {
      onDragEnd(e);
    }
  }

  function handleResizeStart(e) {
    e.cancelBubble = true;
    e.evt.preventDefault();
    e.evt.stopPropagation();

    setIsResizing(true);
    isResizingRef.current = true;
    setShowPalette(false);

    // Store initial data for resize calculation
    const group = groupRef.current;
    const stage = group?.getStage();
    const pointer = stage?.getPointerPosition();

    if (group && pointer) {
      // Lock group position during resize
      const lockedPos = { x: note.x, y: note.y };
      group.x(lockedPos.x);
      group.y(lockedPos.y);
      group.draggable(false);

      // Store initial resize data
      initialResizeData.current = {
        startPointer: { ...pointer },
        startSize: { ...noteSize },
        groupPos: lockedPos,
      };
    }
  }

  const emitResizeThrottled = useRef(
    throttle((w, h) => {
      // Avoid spamming server and only emit when values change meaningfully
      const last = lastEmittedSizeRef.current;
      if (last.width === w && last.height === h) return;
      lastEmittedSizeRef.current = { width: w, height: h };
      socket.emit("note:update", boardId, note.id, { width: w, height: h });
    }, 80)
  ).current;

  function handleResize(e) {
    e.cancelBubble = true;
    e.evt.preventDefault();
    e.evt.stopPropagation();

    if (!isResizingRef.current || !initialResizeData.current) return;

    const group = groupRef.current;
    const stage = group?.getStage();
    const pointer = stage?.getPointerPosition();

    if (!group || !pointer) return;

    // Ensure group stays locked at note position
    group.x(note.x);
    group.y(note.y);
    group.draggable(false);

    // Calculate size based on pointer movement from start position
    const { startPointer, startSize } = initialResizeData.current;
    const deltaX = pointer.x - startPointer.x;
    const deltaY = pointer.y - startPointer.y;

    const newWidth = Math.max(100, Math.round(startSize.width + deltaX));
    const newHeight = Math.max(60, Math.round(startSize.height + deltaY));

    // Update local size immediately for smooth UX
    setNoteSize({ width: newWidth, height: newHeight });

    // Position resize handle at new corner
    const handle = resizeHandleRef.current;
    if (handle) {
      handle.x(newWidth - 8);
      handle.y(newHeight - 8);
    }

    // Throttle server updates
    emitResizeThrottled(newWidth, newHeight);
  }

  function handleResizeEnd(e) {
    e.cancelBubble = true;
    e.evt.preventDefault();
    e.evt.stopPropagation();

    setIsResizing(false);
    isResizingRef.current = false;
    initialResizeData.current = null;

    const group = groupRef.current;
    if (group) {
      // Final position lock and re-enable dragging
      group.x(note.x);
      group.y(note.y);
      group.draggable(!isEditing);
    }

    // Send final size update
    const { width, height } = noteSize;
    socket.emit("note:update", boardId, note.id, { width, height });

    // Restore cursor
    const stage = group?.getStage();
    if (stage) {
      stage.container().style.cursor = "default";
    }
  }

  // Get current note color or default
  const noteColor = note.color || "#fef3c7";
  const { width, height } = noteSize;

  return (
    <Group
      ref={groupRef}
      x={note.x}
      y={note.y}
      draggable={!isEditing && !isResizing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Drop shadow */}
      <Rect
        x={3}
        y={3}
        width={width}
        height={height}
        fill="rgba(0,0,0,0.1)"
        cornerRadius={8}
      />

      {/* Main note background */}
      <Rect
        width={width}
        height={height}
        fill={noteColor}
        stroke={isDragging ? "#3b82f6" : isHovered ? "#6b7280" : "#d1d5db"}
        strokeWidth={isDragging ? 2 : 1}
        cornerRadius={8}
        shadowColor="rgba(0,0,0,0.1)"
        shadowBlur={isDragging ? 8 : 4}
        shadowOffset={{ x: 2, y: 2 }}
        shadowOpacity={0.3}
        onDblClick={startEdit}
      />

      {/* Paper texture lines - only show if note is tall enough */}
      {height > 50 && (
        <>
          <Rect
            x={12}
            y={25}
            width={width - 24}
            height={1}
            fill="rgba(0,0,0,0.03)"
          />
          {height > 70 && (
            <Rect
              x={12}
              y={40}
              width={width - 24}
              height={1}
              fill="rgba(0,0,0,0.03)"
            />
          )}
          {height > 90 && (
            <Rect
              x={12}
              y={55}
              width={width - 24}
              height={1}
              fill="rgba(0,0,0,0.03)"
            />
          )}
          {height > 110 && (
            <Rect
              x={12}
              y={70}
              width={width - 24}
              height={1}
              fill="rgba(0,0,0,0.03)"
            />
          )}
        </>
      )}

      {/* Delete X */}
      {(isHovered || isDragging || showPalette) && (
        <Group
          x={width - 18}
          y={13}
          onClick={handleDelete}
          onMouseEnter={(e) => {
            const group = e.currentTarget;
            group.to({
              scaleX: 1.15,
              scaleY: 1.15,
              duration: 0.1,
            });
            group.findOne("Circle").fill("#dc2626"); // darker red on hover
            group.getStage().container().style.cursor = "pointer";
          }}
          onMouseLeave={(e) => {
            const group = e.currentTarget;
            group.to({
              scaleX: 1,
              scaleY: 1,
              duration: 0.1,
            });
            group.findOne("Circle").fill("#ef4444"); // back to normal red
            group.getStage().container().style.cursor = "default";
          }}
          onMouseDown={(e) => {
            const group = e.currentTarget;
            group.to({ scaleX: 0.9, scaleY: 0.9, duration: 0.05 });
          }}
          onMouseUp={(e) => {
            const group = e.currentTarget;
            group.to({ scaleX: 1.15, scaleY: 1.15, duration: 0.1 });
          }}
        >
          {/* Red circle background */}
          <Circle
            radius={8}
            fill="#ef4444" // Tailwind red-500
            shadowColor="rgba(0,0,0,0.15)"
            shadowBlur={2}
          />
          {/* White X */}
          <Path
            data="M-3 -3 L3 3 M3 -3 L-3 3"
            stroke="white"
            strokeWidth={2}
            lineCap="round"
          />
        </Group>
      )}

      {/* Color picker button - top left corner inside note */}
      {(isHovered || isDragging || showPalette) && (
        <Circle
          x={15}
          y={15}
          radius={8}
          fill={noteColor}
          stroke="rgba(17,16,16,0.8)"
          strokeWidth={2}
          shadowColor="rgba(0,0,0,0.3)"
          onMouseEnter={(e) => {
            const shape = e.target;
            shape.to({
              scaleX: 1.15,
              scaleY: 1.15,
              shadowBlur: 6,
              duration: 0.15,
            });
            shape.getStage().container().style.cursor = "pointer";
          }}
          onMouseLeave={(e) => {
            const shape = e.target;
            shape.to({
              scaleX: 1,
              scaleY: 1,
              shadowBlur: 0,
              duration: 0.15,
            });
            shape.getStage().container().style.cursor = "default";
          }}
          onMouseDown={(e) => {
            const shape = e.target;
            shape.to({
              scaleX: 0.9,
              scaleY: 0.9,
              duration: 0.1,
            });
          }}
          onMouseUp={(e) => {
            const shape = e.target;
            shape.to({
              scaleX: 1.15,
              scaleY: 1.15,
              duration: 0.1,
            });
          }}
          onClick={togglePalette}
        />
      )}

      {/* Text content */}
      {!isEditing && (
        <Text
          text={note.text}
          x={12}
          y={height > 40 ? 30 : 12}
          fontSize={13}
          fontFamily="'Inter', 'Segoe UI', sans-serif"
          width={width - 24}
          height={height - (height > 40 ? 40 : 24)}
          fill="#374151"
          lineHeight={1.4}
          wrap="word"
          verticalAlign="top"
          onDblClick={startEdit}
        />
      )}

      {/* Edit mode input */}
      {isEditing && (
        <Html groupProps={{ x: 12, y: height > 40 ? 30 : 12 }}>
          <textarea
            autoFocus
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={finishEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                finishEdit();
              }
              if (e.key === "Escape") {
                setValue(note.text);
                finishEdit();
              }
            }}
            className="resize-none border-none outline-none bg-transparent text-sm text-gray-700 font-medium leading-relaxed p-0"
            style={{
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              width: `${width - 24}px`,
              height: `${height - (height > 40 ? 40 : 24)}px`,
              minHeight: "20px",
            }}
            placeholder="Type your note..."
          />
        </Html>
      )}

      {/* Color palette */}
      {showPalette && (
        <Html groupProps={{ x: 10, y: -50 }}>
          <div
            className="flex flex-wrap gap-1.5 rounded-lg border border-gray-200 bg-white p-2 shadow-lg z-50"
            onClick={(e) => e.stopPropagation()}
            style={{ width: "180px" }}
          >
            {PALETTE.map((colorObj) => (
              <button
                key={colorObj.color}
                onClick={() => applyColor(colorObj)}
                className="h-7 w-7 rounded-full border-2 border-gray-200 hover:border-gray-400 hover:scale-110 transition-all duration-200 shadow-sm"
                style={{ background: colorObj.color }}
                title={colorObj.name}
              />
            ))}
          </div>
        </Html>
      )}

      {/* Resize handle - bottom right corner */}
      {(isHovered || isDragging || isResizing) && !isEditing && (
        <Group
          x={width - 12} // nudged a bit so the handle sits slightly outside the card corner
          y={height - 12}
          ref={resizeHandleRef}
          draggable={true}
          onMouseDown={(e) => {
            // stop Konva from letting parent handle this event
            e.cancelBubble = true;
            e.evt.preventDefault();
            e.evt.stopPropagation();
            // small immediate press feedback
            const g = e.currentTarget;
            g.to({ scaleX: 0.9, scaleY: 0.9, duration: 0.06 });
            handleResizeStart(e);
          }}
          onDragStart={handleResizeStart}
          onDragMove={handleResize}
          onDragEnd={(e) => {
            const g = e.currentTarget;
            g.to({ scaleX: 1, scaleY: 1, duration: 0.08 });
            handleResizeEnd(e);
          }}
          onMouseEnter={(e) => {
            const g = e.currentTarget;
            const stage = g.getStage();
            if (stage) stage.container().style.cursor = "se-resize";
            g.to({ scaleX: 1.12, scaleY: 1.12, duration: 0.12 });
            // lighten circle on hover
            g.findOne(".bg").fill("rgba(59,130,246,0.95)");
          }}
          onMouseLeave={(e) => {
            const g = e.currentTarget;
            const stage = g.getStage();
            if (stage && !isResizing)
              stage.container().style.cursor = "default";
            g.to({ scaleX: 1, scaleY: 1, duration: 0.12 });
            g.findOne(".bg").fill("rgba(59,130,246,0.8)");
          }}
        >
          {/* Background circle */}
          <Circle
            name="bg"
            x={0}
            y={0}
            radius={8}
            fill="rgba(59,130,246,0.8)" // Tailwind blue-500 @ 80% opacity
            stroke="white"
            strokeWidth={1}
            shadowColor="rgba(2,6,23,0.2)"
            shadowBlur={4}
            shadowOffset={{ x: 0, y: 1 }}
          />

          {/* Grip: three diagonal short lines to indicate resize */}
          <Group rotation={45} x={-1} y={0}>
            <Rect
              x={-2}
              y={-4.5}
              width={6}
              height={1.2}
              fill="rgba(255,255,255,0.92)"
              cornerRadius={1}
            />
            <Rect
              x={-2}
              y={-1}
              width={6}
              height={1.2}
              fill="rgba(255,255,255,0.82)"
              cornerRadius={1}
            />
            <Rect
              x={-2}
              y={2.5}
              width={6}
              height={1.2}
              fill="rgba(255,255,255,0.72)"
              cornerRadius={1}
            />
          </Group>
        </Group>
      )}
    </Group>
  );
}
