import { useState, useEffect, useRef } from "react";
import { Rect, Text, Group, Circle, Path } from "react-konva";
import { Html } from "react-konva-utils";

// Mirrors the board toolbar's NOTE_COLORS so the in-note picker and the
// new-note swatches always offer the same warm set.
const PALETTE = [
  { color: "#fde68a", name: "Amber" },
  { color: "#fed7aa", name: "Peach" },
  { color: "#bae6fd", name: "Sky" },
  { color: "#bbf7d0", name: "Mint" },
  { color: "#fbcfe8", name: "Pink" },
  { color: "#ddd6fe", name: "Lavender" },
];

// Warm-neutral chrome colors, aligned to the app's design tokens (ink / line).
const INK = "#1c1917";
const BORDER_HOVER = "#a8a29e";
const BORDER_IDLE = "#e7e5e4";

import { throttle } from "../lib/throttle";

import { filterMentionCandidates } from "../lib/mentions";

export default function Note({
  note,
  canEdit = true,
  canComment = false,
  mentionPeople = [],
  onOpenComments,
  onDragStart,
  onDragEnd,
  activeNoteId,
  setActiveNoteId,
  onOptimisticUpdate,
  onRequestDelete,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [value, setValue] = useState(note.text);
  // @mention autocomplete state while editing: { query, start, index } | null.
  const [mention, setMention] = useState(null);
  const [showPalette, setShowPalette] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const textareaRef = useRef(null);
  const [noteSize, setNoteSize] = useState({
    width: note.width || 180,
    height: note.height || 120,
  });

  // Refs for managing state and positions
  const groupRef = useRef();
  const resizeHandleRef = useRef();
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const initialResizeData = useRef(null);

  // keep local text synced with server pushes
  useEffect(() => {
    setValue(note.text);
  }, [note.text]);

  // Detect mobile and handle control visibility
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < 1024 || "ontouchstart" in window;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Position cursor at end when editing starts
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      const textarea = textareaRef.current;
      // Delay to ensure the textarea is fully rendered and positioned
      const delay = isMobile ? 50 : 10; // Longer delay for mobile
      setTimeout(() => {
        textarea.focus();
        // Move cursor to end of text - works for both mobile and PC
        const length = textarea.value.length;
        textarea.setSelectionRange(length, length);
        textarea.scrollTop = 0; // Ensure we're at the top of the text area
        // Force cursor to end again in case of race conditions
        requestAnimationFrame(() => {
          textarea.setSelectionRange(length, length);
        });
      }, delay);
    }
  }, [isEditing, isMobile]);

  // Sync size changes with safety checks
  useEffect(() => {
    // If we're actively resizing, ignore server echoes to avoid jitter
    if (isResizingRef.current) return;

    if (note.width && note.height) {
      const newSize = { width: note.width, height: note.height };
      setNoteSize(newSize);
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
    if (!canEdit) return; // viewers/commenters can't edit note text
    setShowPalette(false);
    setIsEditing(true);
  }

  // Handle double-tap for mobile and double-click for desktop
  function handleTap(e) {
    // Prevent event bubbling to avoid multiple calls
    if (e.evt) {
      e.evt.stopPropagation();
      e.evt.preventDefault();
    }

    // Don't handle tap events during dragging
    if (isDragging || isDraggingRef.current) {
      return;
    }

    const now = Date.now();
    const timeDiff = now - lastTapTime;

    if (isMobile) {
      // Check for double tap: must be within 300ms AND lastTapTime must not be 0
      if (timeDiff < 300 && lastTapTime > 0) {
        // Double tap detected - start editing
        startEdit();
        setLastTapTime(0); // Reset to prevent triple tap
      } else {
        // Single tap - show/hide controls on mobile
        if (activeNoteId === note.id) {
          setActiveNoteId(null);
        } else {
          setActiveNoteId(note.id);
        }
        setLastTapTime(now);
      }
    } else {
      // On desktop, just record the tap time for potential double-click
      setLastTapTime(now);
    }
  }

  // Handle double-click for desktop
  function handleDoubleClick(e) {
    if (!isMobile) {
      e.evt?.stopPropagation();
      startEdit();
    }
  }

  // A note is "active" (selected) when its id matches activeNoteId — set by a
  // tap on mobile or a click on desktop. Active notes keep their controls and
  // a solid selection ring; they're also the target for keyboard delete/dup.
  const isActive = activeNoteId === note.id;
  // Edit affordances (delete, color, resize) only render when the viewer can
  // actually edit; selection/hover ring still works for read-only roles.
  const showControls = canEdit && (isHovered || isDragging || showPalette || isActive);

  // Compact reaction / comment summary shown at the foot of the note.
  const reactionSummary = (() => {
    const counts = {};
    for (const r of note.reactions || []) counts[r.emoji] = (counts[r.emoji] || 0) + 1;
    const parts = Object.entries(counts)
      .slice(0, 4)
      .map(([e, c]) => `${e} ${c}`);
    if (note.commentCount) parts.push(`💬 ${note.commentCount}`);
    return parts.join("   ");
  })();
  const commentBtnVisible = canComment && !isEditing && (isHovered || isActive);

  function handleSelect() {
    if (isDraggingRef.current) return;
    if (activeNoteId !== note.id) setActiveNoteId?.(note.id);
  }

  function finishEdit() {
    setIsEditing(false);
    setMention(null);
    const next = value.trim();
    
    if (next !== note.text && onOptimisticUpdate) {
      onOptimisticUpdate(note.id, { text: next });
    }

    // Clear mobile controls after editing
    if (isMobile && setActiveNoteId) {
      setActiveNoteId(null);
    }

    // On mobile, blur any active element and prevent viewport zoom
    if (isMobile) {
      if (textareaRef.current) {
        textareaRef.current.blur();
      }
      setTimeout(() => {
        if (window.visualViewport) {
          window.scrollTo(0, 0);
        }
      }, 100);
    }
  }

  function handleDelete() {
    onRequestDelete(note.id);
  }

  // ---- @mention autocomplete -------------------------------------------------
  const mentionMatches =
    mention && mentionPeople.length
      ? filterMentionCandidates(mentionPeople, mention.query)
      : [];

  // Detect a partial "@handle" token immediately before the caret.
  function refreshMention(el) {
    if (!el) return setMention(null);
    const caret = el.selectionStart ?? el.value.length;
    const m = /(^|\s)@([\w.-]*)$/.exec(el.value.slice(0, caret));
    if (m) {
      const start = caret - m[2].length - 1; // position of the "@"
      setMention({ query: m[2], start, index: 0 });
    } else {
      setMention(null);
    }
  }

  function handleEditorChange(e) {
    setValue(e.target.value);
    refreshMention(e.target);
  }

  function insertMention(cand) {
    const el = textareaRef.current;
    const caret = el ? el.selectionStart : value.length;
    const before = value.slice(0, mention.start);
    const after = value.slice(caret);
    const inserted = `@${cand.handle} `;
    const next = before + inserted + after;
    setValue(next);
    setMention(null);
    requestAnimationFrame(() => {
      if (el) {
        const pos = (before + inserted).length;
        el.focus();
        el.setSelectionRange(pos, pos);
      }
    });
  }

  function togglePalette() {
    setShowPalette((s) => !s);
  }

  function applyColor(colorObj) {
    if (onOptimisticUpdate) {
      onOptimisticUpdate(note.id, { color: colorObj.color });
    }
    setShowPalette(false);
    
    // Clear mobile controls after color change
    if (isMobile && setActiveNoteId) {
      setTimeout(() => setActiveNoteId(null), 100);
    }
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

    // Clear mobile controls after dragging on mobile - with delay to ensure drag is complete
    if (isMobile && setActiveNoteId) {
      setTimeout(() => {
        setActiveNoteId(null);
      }, 100);
    }

    // Only emit drag end if we weren't resizing
    if (!isResizingRef.current && onDragEnd) {
      onDragEnd(e, note); // Pass note object for position updates
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
      if (onOptimisticUpdate) {
        onOptimisticUpdate(note.id, { width: w, height: h });
      }
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
    if (onOptimisticUpdate) {
      onOptimisticUpdate(note.id, { width, height });
    }

    // Restore cursor
    const stage = group?.getStage();
    if (stage) {
      stage.container().style.cursor = "default";
    }
  }

  // Get current note color or default
  const noteColor = note.color || "#fde68a";
  const { width, height } = noteSize;

  return (
    <Group
      ref={groupRef}
      x={note.x}
      y={note.y}
      draggable={canEdit && !isEditing && !isResizing}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onMouseEnter={() => !isMobile && setIsHovered(true)}
      onMouseLeave={() => !isMobile && setIsHovered(false)}
      onClick={isMobile ? undefined : handleSelect}
      onTap={isMobile ? handleTap : undefined}
      onDblClick={isMobile ? null : handleDoubleClick}
    >
      {/* Drop shadow */}
      <Rect
        x={3}
        y={3}
        width={width}
        height={height}
        fill="rgba(0,0,0,0.1)"
        cornerRadius={8}
        listening={false}
        perfectDrawEnabled={false}
      />

      {/* Main note background */}
      <Rect
        width={width}
        height={height}
        fill={noteColor}
        stroke={
          isDragging || isActive
            ? INK // solid ink ring while dragging or selected
            : isHovered
            ? BORDER_HOVER
            : BORDER_IDLE
        }
        strokeWidth={isDragging || isActive ? 2 : 1}
        cornerRadius={8}
        shadowColor="rgba(0,0,0,0.1)"
        shadowBlur={isDragging ? 8 : 4}
        shadowOffset={{ x: 2, y: 2 }}
        shadowOpacity={0.3}
        perfectDrawEnabled={false}
        shadowForStrokeEnabled={false}
        onDblClick={
          isMobile
            ? null
            : () => {
                startEdit();
              }
        }
        onTouchEnd={undefined}
        onClick={isMobile ? null : undefined}
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
            listening={false}
            perfectDrawEnabled={false}
          />
          {height > 70 && (
            <Rect
              x={12}
              y={40}
              width={width - 24}
              height={1}
              fill="rgba(0,0,0,0.03)"
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
          {height > 90 && (
            <Rect
              x={12}
              y={55}
              width={width - 24}
              height={1}
              fill="rgba(0,0,0,0.03)"
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
          {height > 110 && (
            <Rect
              x={12}
              y={70}
              width={width - 24}
              height={1}
              fill="rgba(0,0,0,0.03)"
              listening={false}
              perfectDrawEnabled={false}
            />
          )}
        </>
      )}

      {/* Delete X */}
      {showControls && (
        <Group
          x={width - 18}
          y={13}
          onClick={handleDelete}
          onTouchEnd={(e) => {
            e.evt.stopPropagation();
            e.evt.preventDefault();
            handleDelete();
          }}
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
      {showControls && (
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
          onTouchEnd={(e) => {
            e.evt.stopPropagation();
            e.evt.preventDefault();
            togglePalette();
          }}
        />
      )}

      {/* Reaction / comment summary (display-only) */}
      {reactionSummary && !commentBtnVisible && (
        <Text
          text={reactionSummary}
          x={12}
          y={height - 18}
          fontSize={11}
          fontFamily="'Inter', 'Segoe UI', sans-serif"
          fill="#57534e"
          listening={false}
        />
      )}

      {/* Open comments / react button */}
      {commentBtnVisible && (
        <Group
          x={14}
          y={height - 14}
          onClick={(e) => {
            e.cancelBubble = true;
            onOpenComments?.(note.id);
          }}
          onTap={(e) => {
            e.evt?.stopPropagation();
            onOpenComments?.(note.id);
          }}
          onMouseEnter={(e) => {
            e.currentTarget.getStage().container().style.cursor = "pointer";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.getStage().container().style.cursor = "default";
          }}
        >
          <Rect x={-10} y={-10} width={56} height={20} cornerRadius={10} fill="rgba(28,25,23,0.06)" />
          <Path
            data="M-4 -4 H4 a2 2 0 0 1 2 2 v3 a2 2 0 0 1 -2 2 H0 l-3 3 v-3 H-4 a2 2 0 0 1 -2 -2 v-3 a2 2 0 0 1 2 -2 z"
            fill="#44403c"
            scaleX={0.85}
            scaleY={0.85}
          />
          <Text
            text={note.commentCount ? String(note.commentCount) : "Comment"}
            x={10}
            y={-5}
            fontSize={11}
            fontFamily="'Inter', 'Segoe UI', sans-serif"
            fill="#44403c"
          />
        </Group>
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
          fill="#44403c"
          lineHeight={1.4}
          wrap="word"
          verticalAlign="top"
          onDblClick={isMobile ? null : startEdit}
          onTouchEnd={undefined}
        />
      )}

      {/* Edit mode input */}
      {isEditing && (
        <Html groupProps={{ x: 12, y: height > 40 ? 30 : 12 }}>
         <div style={{ position: "relative", width: `${width - 24}px` }}>
          <textarea
            ref={textareaRef}
            autoFocus
            value={value}
            onChange={handleEditorChange}
            onBlur={() => {
              // Let a mention-menu click land before committing/closing.
              setTimeout(() => finishEdit(), 120);
            }}
            onClick={(e) => refreshMention(e.target)}
            onTouchStart={(e) => {
              // Prevent any touch zoom on the textarea
              e.stopPropagation();
            }}
            onFocus={(e) => {
              // Prevent parent events during editing
              e.stopPropagation();
              // Ensure cursor goes to end when focused - for both mobile and desktop
              const textarea = e.target;
              setTimeout(
                () => {
                  const length = textarea.value.length;
                  textarea.setSelectionRange(length, length);
                },
                isMobile ? 10 : 5
              ); // Slightly longer delay for mobile
            }}
            onKeyDown={(e) => {
              // When the mention menu is open, arrows/Enter/Tab drive it.
              if (mentionMatches.length > 0) {
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setMention((m) => ({ ...m, index: (m.index + 1) % mentionMatches.length }));
                  return;
                }
                if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setMention((m) => ({
                    ...m,
                    index: (m.index - 1 + mentionMatches.length) % mentionMatches.length,
                  }));
                  return;
                }
                if (e.key === "Enter" || e.key === "Tab") {
                  e.preventDefault();
                  insertMention(mentionMatches[mention.index] || mentionMatches[0]);
                  return;
                }
                if (e.key === "Escape") {
                  e.preventDefault();
                  setMention(null);
                  return;
                }
              }
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                finishEdit();
              }
              if (e.key === "Escape") {
                setValue(note.text);
                finishEdit();
              }
            }}
            className="resize-none border-none outline-none bg-transparent text-sm text-gray-700 font-medium leading-relaxed p-0 touch-manipulation"
            style={{
              fontFamily: "'Inter', 'Segoe UI', sans-serif",
              width: `${width - 24}px`,
              height: `${height - (height > 40 ? 40 : 24)}px`,
              minHeight: "20px",
              fontSize: "16px", // Prevent zoom on mobile browsers
              transform: "translateZ(0)", // Force hardware acceleration
              WebkitTransform: "translateZ(0)", // Safari
              WebkitUserSelect: "text", // Allow text selection
              WebkitTouchCallout: "none", // Disable callout
              WebkitTapHighlightColor: "transparent", // Remove tap highlight
              userSelect: "text", // Standard property
              touchAction: "manipulation", // Prevent double-tap zoom
              // Additional cross-browser zoom prevention
              zoom: "1", // Prevent IE zoom
              maxHeight: "none", // Prevent height restrictions
              lineHeight: "1.4", // Consistent line height
              // Prevent zoom in Chrome/Edge on Android
              WebkitTextSizeAdjust: "100%",
              textSizeAdjust: "100%",
            }}
            placeholder="Type your note..."
          />

          {/* @mention autocomplete menu */}
          {mentionMatches.length > 0 && (
            <div
              className="absolute left-0 top-full z-50 mt-1 w-52 overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              onMouseDown={(e) => e.preventDefault()} // keep textarea focus
            >
              {mentionMatches.map((c, i) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => insertMention(c)}
                  onMouseEnter={() => setMention((m) => (m ? { ...m, index: i } : m))}
                  className={`flex w-full items-center gap-2 px-3 py-1.5 text-left text-sm ${
                    i === mention.index ? "bg-gray-100" : "hover:bg-gray-50"
                  }`}
                >
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gray-200 text-[11px] font-semibold uppercase text-gray-600">
                    {(c.name || c.handle).slice(0, 1)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-gray-800">{c.name}</span>
                    <span className="block truncate text-[11px] text-gray-400">@{c.handle}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
         </div>
        </Html>
      )}

      {/* Color palette */}
      {showPalette && (
        <Html groupProps={{ x: 10, y: -50 }}>
          <div
            className="flex flex-wrap gap-2 rounded-lg border border-gray-200 bg-white p-3 shadow-lg z-50"
            onClick={(e) => e.stopPropagation()}
            style={{ width: window.innerWidth < 768 ? "200px" : "180px" }}
          >
            {PALETTE.map((colorObj) => (
              <button
                key={colorObj.color}
                onClick={() => applyColor(colorObj)}
                className={`${
                  window.innerWidth < 768 ? "h-8 w-8" : "h-7 w-7"
                } rounded-full border-2 border-gray-200 hover:border-gray-400 hover:scale-110 transition-all duration-200 shadow-sm touch-manipulation`}
                style={{ background: colorObj.color }}
                title={colorObj.name}
              />
            ))}
          </div>
        </Html>
      )}

      {/* Resize handle - bottom right corner */}
      {(showControls || isResizing) && !isEditing && (
          <Group
            x={width - 16} // Increased touch target area
            y={height - 16}
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
            onTouchStart={(e) => {
              // Touch support for resize handle
              e.cancelBubble = true;
              e.evt.preventDefault();
              e.evt.stopPropagation();
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
              // darken circle on hover
              g.findOne(".bg").fill("rgba(28,25,23,0.95)");
            }}
            onMouseLeave={(e) => {
              const g = e.currentTarget;
              const stage = g.getStage();
              if (stage && !isResizing)
                stage.container().style.cursor = "default";
              g.to({ scaleX: 1, scaleY: 1, duration: 0.12 });
              g.findOne(".bg").fill("rgba(28,25,23,0.8)");
            }}
          >
            {/* Background circle - larger for touch */}
            <Circle
              name="bg"
              x={0}
              y={0}
              radius={12} // Increased from 8 to 12 for better touch target
              fill="rgba(28,25,23,0.8)" // ink @ 80% opacity
              stroke="white"
              strokeWidth={1}
              shadowColor="rgba(2,6,23,0.2)"
              shadowBlur={4}
              shadowOffset={{ x: 0, y: 1 }}
            />

            {/* Grip: three diagonal short lines to indicate resize */}
            <Group rotation={45} x={-1} y={0}>
              <Rect
                x={-3}
                y={-6}
                width={8}
                height={1.5}
                fill="rgba(255,255,255,0.92)"
                cornerRadius={1}
              />
              <Rect
                x={-3}
                y={-1.5}
                width={8}
                height={1.5}
                fill="rgba(255,255,255,0.82)"
                cornerRadius={1}
              />
              <Rect
                x={-3}
                y={3}
                width={8}
                height={1.5}
                fill="rgba(255,255,255,0.72)"
                cornerRadius={1}
              />
            </Group>
          </Group>
        )}
    </Group>
  );
}
