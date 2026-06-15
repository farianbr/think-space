import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Stage, Layer } from "react-konva";
import Konva from "konva";

// Cap the canvas pixel ratio on touch/mobile devices. Phones often report a
// devicePixelRatio of 2-3, which forces Konva to repaint 4-9x as many pixels
// every pan frame — the main cause of laggy panning. Must be set at module load,
// before any Stage/Layer canvas is created. Desktop keeps full sharpness.
if (typeof window !== "undefined") {
  const isTouch = window.innerWidth < 1024 || "ontouchstart" in window;
  if (isTouch) {
    Konva.pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
  }
}
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Users,
  Share2,
  Download,
  Mic,
  HelpCircle,
  Pencil,
  PanelRightOpen,
} from "lucide-react";

import { connectSocket, socket } from "../lib/socket";
import { fetchBoard, fetchNotes } from "../lib/api";
import { throttle } from "../lib/throttle";
import { useAuth } from "../contexts/authContext";
import { canEditRole, canCommentRole, canManageMembersRole, roleMeta } from "../lib/roles";

import Note from "../components/Note";
import MobileHelpModal from "../components/MobileHelpModal";
import ShareModal from "../components/sharing/ShareModal";
import BoardPanel from "../components/board/BoardPanel";
import RenameBoardModal from "../components/board/RenameBoardModal";
import { IconButton, Button, Tooltip, AvatarGroup } from "../components/ui";
import useOnlineMembers from "../hooks/useOnlineMembers";
import useMembersSocket from "../hooks/useMembersSocket";
import { useBoardMembers } from "../hooks/members";
import { mentionCandidates } from "../lib/mentions";
import { cn } from "../lib/cn";

// Sticky palette for new notes (warm, muted).
const NOTE_COLORS = ["#fde68a", "#fed7aa", "#bae6fd", "#bbf7d0", "#fbcfe8", "#ddd6fe"];

export default function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notes, setNotes] = useState([]);
  const [joined, setJoined] = useState(false);
  const [role, setRole] = useState(null);
  const canEdit = canEditRole(role);
  const canComment = canCommentRole(role);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showMobileHelpModal, setShowMobileHelpModal] = useState(false);
  const [showRename, setShowRename] = useState(false);
  const [panel, setPanel] = useState(null); // null | "activity" | "members" | "voice"
  const [draftColor, setDraftColor] = useState(NOTE_COLORS[0]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const userZoomedRef = useRef(false);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isMiddlePanning, setIsMiddlePanning] = useState(false);
  const [dragStartTarget, setDragStartTarget] = useState(null);
  const stageRef = useRef();
  const containerRef = useRef();
  const joinedRef = useRef(false);
  const leaveTimerRef = useRef(null);

  // Helper to determine min/max scale based on viewport (mobile vs desktop)
  const getScaleBounds = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      return { minScale: 0.1, maxScale: 2.0 };
    }
    return { minScale: 0.5, maxScale: 3.0 };
  };

  // Initial mobile scale.
  useEffect(() => {
    if (!canvasSize.width || !canvasSize.height) return;
    if (userZoomedRef.current) return;
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      if (scale === 1) setScale(0.5);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvasSize.width, canvasSize.height]);

  const {
    data: board,
    isLoading: boardLoading,
    error: boardError,
  } = useQuery({
    queryKey: ["board", boardId],
    queryFn: () => fetchBoard(boardId),
    enabled: !!boardId,
  });

  const { online } = useOnlineMembers(boardId);
  useMembersSocket(boardId);

  // Members power the @mention autocomplete while editing a note.
  const { data: boardMembers } = useBoardMembers(boardId);
  const mentionPeople = mentionCandidates(boardMembers || [], user?.id);

  // Fallback: Fetch notes via REST so first load shows something even if socket connect is delayed
  const { data: notesFallback } = useQuery({
    queryKey: ["notes", boardId],
    queryFn: () => fetchNotes(boardId),
    enabled: !!boardId,
    staleTime: 5_000,
  });

  useEffect(() => {
    function updateSize() {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
      }
    }
    const timeoutId = setTimeout(updateSize, 50);
    updateSize();
    window.addEventListener("resize", updateSize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", updateSize);
    };
  }, []);

  // Recalculate size when the panel opens/closes (canvas width changes).
  useEffect(() => {
    const id = setTimeout(() => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        setCanvasSize({ width: rect.width, height: rect.height });
        stageRef.current?.batchDraw();
      }
    }, 60);
    return () => clearTimeout(id);
  }, [panel]);

  // Force Stage re-render when notes change to ensure proper rendering
  useEffect(() => {
    if (notes.length > 0) {
      setTimeout(() => {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          setCanvasSize({ width: rect.width, height: rect.height });
        }
        if (stageRef.current) {
          stageRef.current.batchDraw();
        }
      }, 150);
    }
  }, [notes]);

  // Ensure canvas size is calculated when board loads
  useEffect(() => {
    if (board && containerRef.current) {
      const updateSize = () => {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0) {
          setCanvasSize({ width: rect.width, height: rect.height });
        }
      };
      updateSize();
      setTimeout(updateSize, 100);
      setTimeout(updateSize, 300);
    }
  }, [board]);

  // Apply fallback notes once (only the earliest source wins)
  useEffect(() => {
    if (!joinedRef.current && Array.isArray(notesFallback)) {
      setNotes(notesFallback);
    }
  }, [notesFallback]);

  useEffect(() => {
    if (!boardId || !user) return;

    setJoined(false);
    joinedRef.current = false;

    connectSocket();

    function ensureJoin() {
      if (joinedRef.current) return;
      setTimeout(() => {
        socket.emit("board:join", boardId, (response) => {
          if (response && response.ok) {
            setNotes(response.notes || []);
            setRole(response.role || null);
            setJoined(true);
            if (!joinedRef.current) {
              toast.success("Connected to board");
            }
            joinedRef.current = true;
          } else {
            if (response && (response.status === 403 || response.status === 404)) {
              toast.error("Access denied or board not found");
              navigate("/boards");
            } else {
              toast.error("Failed to connect to board");
              console.debug("board:join failed", response);
            }
          }
        });
      }, 100);
    }

    if (leaveTimerRef.current) {
      clearTimeout(leaveTimerRef.current);
      leaveTimerRef.current = null;
    }

    if (socket.connected) {
      ensureJoin();
    } else {
      socket.once("connect", ensureJoin);
    }
    socket.on("reconnect", ensureJoin);
    const onDisconnect = () => {
      joinedRef.current = false;
      setJoined(false);
    };
    const onConnectError = (err) => {
      console.debug("socket connect_error", err?.message || err);
    };
    socket.on("connect_error", onConnectError);
    socket.on("disconnect", onDisconnect);
    return () => {
      leaveTimerRef.current = setTimeout(() => {
        if (joinedRef.current) {
          socket.emit("board:leave", boardId);
          joinedRef.current = false;
        }
      }, 250);
      socket.off("connect", ensureJoin);
      socket.off("reconnect", ensureJoin);
      socket.off("connect_error", onConnectError);
      socket.off("disconnect", onDisconnect);
      setJoined(false);
    };
  }, [boardId, user, navigate]);

  // Panning: hold Space to pan; also support middle mouse button drag
  useEffect(() => {
    const down = (e) => {
      if (e.code === "Space") setIsPanning(true);
    };
    const up = (e) => {
      if (e.code === "Space") setIsPanning(false);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const container = stage.container();
    if (container) container.style.touchAction = "none";
  }, [canvasSize.width, canvasSize.height]);

  // Touch events for mobile panning - simplified approach
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        const pos = stage.getPointerPosition();
        const clickedOnStage = stage === stage.getIntersection(pos);
        if (clickedOnStage) {
          stage.draggable(true);
        }
      } else {
        stage.draggable(false);
      }
    };

    const handleTouchEnd = () => {
      stage.draggable(isPanning);
    };

    if (containerRef.current) {
      const container = containerRef.current;
      container.addEventListener("touchstart", handleTouchStart, { passive: true });
      container.addEventListener("touchend", handleTouchEnd, { passive: true });
      return () => {
        container.removeEventListener("touchstart", handleTouchStart);
        container.removeEventListener("touchend", handleTouchEnd);
      };
    }
  }, [isPanning]);

  useEffect(() => {
    if (!boardId) return;

    function onNoteCreated(p) {
      if (!p || p.boardId !== boardId || p.socketId === socket.id) return;
      setNotes((prev) => [...prev, p.note]);
    }
    function onNoteUpdated(p) {
      if (!p || p.boardId !== boardId || p.socketId === socket.id) return;
      setNotes((prev) => prev.map((n) => (n.id === p.note.id ? p.note : n)));
    }
    function onNoteDeleted(p) {
      if (!p || p.boardId !== boardId || p.socketId === socket.id) return;
      setNotes((prev) => prev.filter((n) => n.id !== p.noteId));
    }

    function onReactionUpdated(p) {
      if (!p || p.boardId !== boardId) return;
      setNotes((prev) => prev.map((n) => (n.id === p.noteId ? { ...n, reactions: p.reactions } : n)));
    }
    function onCommentCreated(p) {
      if (!p || p.boardId !== boardId) return;
      setNotes((prev) =>
        prev.map((n) => (n.id === p.noteId ? { ...n, commentCount: (n.commentCount || 0) + 1 } : n))
      );
    }
    function onCommentDeleted(p) {
      if (!p || p.boardId !== boardId) return;
      setNotes((prev) =>
        prev.map((n) =>
          n.id === p.noteId ? { ...n, commentCount: Math.max(0, (n.commentCount || 0) - 1) } : n
        )
      );
    }
    function onRoleChanged(p) {
      if (!p || p.boardId !== boardId) return;
      setRole(p.role || null);
      toast(`Your role is now ${roleMeta(p.role).label}`, { icon: "🔑" });
    }
    function onAccessRevoked(p) {
      if (!p || p.boardId !== boardId) return;
      toast.error("Your access to this board was removed");
      navigate("/boards");
    }

    socket.on("note:created", onNoteCreated);
    socket.on("note:updated", onNoteUpdated);
    socket.on("note:deleted", onNoteDeleted);
    socket.on("reaction:updated", onReactionUpdated);
    socket.on("comment:created", onCommentCreated);
    socket.on("comment:deleted", onCommentDeleted);
    socket.on("board:role_changed", onRoleChanged);
    socket.on("board:access_revoked", onAccessRevoked);

    return () => {
      socket.off("note:created", onNoteCreated);
      socket.off("note:updated", onNoteUpdated);
      socket.off("note:deleted", onNoteDeleted);
      socket.off("reaction:updated", onReactionUpdated);
      socket.off("comment:created", onCommentCreated);
      socket.off("comment:deleted", onCommentDeleted);
      socket.off("board:role_changed", onRoleChanged);
      socket.off("board:access_revoked", onAccessRevoked);
    };
  }, [boardId, navigate]);

  // Create note at specified position (throttled)
  const createNote = throttle((x, y) => {
    if (!boardId || !joined || !canEdit) return;

    const optimisticNote = {
      id: `optimistic-${Date.now()}`,
      text: "",
      x: Math.max(20, Math.min(x - 70, canvasSize.width - 160)),
      y: Math.max(20, Math.min(y - 45, canvasSize.height - 110)),
      color: draftColor,
      width: 180,
      height: 120,
      isOptimistic: true,
    };

    setNotes((prev) => [...prev, optimisticNote]);
    toast.success("Note created");

    socket.emit("note:create", boardId, optimisticNote, (ack) => {
      if (ack && ack.ok && ack.note) {
        setNotes((prev) => prev.map((n) => (n.id === optimisticNote.id ? ack.note : n)));
      } else {
        setNotes((prev) => prev.filter((n) => n.id !== optimisticNote.id));
        toast.error(ack?.message || "Failed to create note");
      }
    });
  }, 200);

  const requestDeleteNote = (noteId) => {
    if (!boardId || !joined || !canEdit) return;
    const noteToDelete = notes.find((n) => n.id === noteId);
    if (!noteToDelete) return;

    setNotes((prev) => prev.filter((n) => n.id !== noteId));
    toast.success("Note deleted");

    if (noteToDelete.isOptimistic) return;

    socket.emit("note:delete", boardId, noteId, (ack) => {
      if (!ack || !ack.ok) {
        setNotes((prev) => [...prev, noteToDelete]);
        toast.error(ack?.message || "Failed to delete note");
      }
    });
  };

  const updateNote = (noteId, updates) => {
    if (!canEdit) return;
    const note = notes.find((n) => n.id === noteId);
    if (!note) return;
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n)));
    if (!note.isOptimistic) {
      socket.emit("note:update", boardId, noteId, updates);
    }
  };

  // Duplicate an existing note: same text/color/size, nudged down-right so the
  // copy is visible. Mirrors createNote's optimistic + ack reconciliation.
  const duplicateNote = (source) => {
    if (!boardId || !joined || !canEdit || !source) return;
    const optimisticNote = {
      id: `optimistic-${Date.now()}`,
      text: source.text || "",
      x: Math.round(source.x) + 24,
      y: Math.round(source.y) + 24,
      color: source.color || draftColor,
      width: source.width || 180,
      height: source.height || 120,
      isOptimistic: true,
    };

    setNotes((prev) => [...prev, optimisticNote]);
    toast.success("Note duplicated");

    socket.emit("note:create", boardId, optimisticNote, (ack) => {
      if (ack && ack.ok && ack.note) {
        setNotes((prev) => prev.map((n) => (n.id === optimisticNote.id ? ack.note : n)));
        setActiveNoteId(ack.note.id);
      } else {
        setNotes((prev) => prev.filter((n) => n.id !== optimisticNote.id));
        toast.error(ack?.message || "Failed to duplicate note");
      }
    });
  };

  const handleNoteDragEnd = (e, note) => {
    const newX = Math.round(e.target.x());
    const newY = Math.round(e.target.y());
    if (newX !== note.x || newY !== note.y) {
      updateNote(note.id, { x: newX, y: newY });
    }
  };

  // Keyboard actions on the selected note. Guarded against firing while a note's
  // textarea is focused so editing keeps normal Backspace/typing behavior.
  useEffect(() => {
    const onKey = (e) => {
      if (!activeNoteId) return;
      const tag = document.activeElement?.tagName;
      if (tag === "TEXTAREA" || tag === "INPUT") return;

      // Esc deselects regardless of role; mutating shortcuts need edit access.
      if (e.key === "Escape") {
        setActiveNoteId(null);
        return;
      }
      if (!canEdit) return;

      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        requestDeleteNote(activeNoteId);
        setActiveNoteId(null);
      } else if ((e.key === "d" || e.key === "D") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        const note = notes.find((n) => n.id === activeNoteId);
        if (note) duplicateNote(note);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeNoteId, notes, joined, canEdit]);

  const addNoteAtCenter = () => {
    if (!joined || !canEdit) return;
    let centerX, centerY;
    if (stageRef.current && stageRef.current.width() > 0 && stageRef.current.height() > 0) {
      const stage = stageRef.current;
      centerX = (stage.width() / 2 - stagePosition.x) / scale;
      centerY = (stage.height() / 2 - stagePosition.y) / scale;
    } else {
      centerX = canvasSize.width > 0 ? (canvasSize.width / 2 - stagePosition.x) / scale : 200;
      centerY = canvasSize.height > 0 ? (canvasSize.height / 2 - stagePosition.y) / scale : 200;
    }
    createNote(centerX, centerY);
  };

  // Select a note and open the side panel to its comment thread.
  const openComments = (noteId) => {
    setActiveNoteId(noteId);
    setPanel("comments");
  };

  const handleExport = () => {
    const stage = stageRef.current;
    if (!stage) return;
    try {
      const uri = stage.toDataURL({ pixelRatio: 2 });
      const link = document.createElement("a");
      link.download = `${board?.title || "think-space-board"}.png`;
      link.href = uri;
      link.click();
      toast.success("Exported as PNG");
    } catch {
      toast.error("Export failed");
    }
  };

  if (boardLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas">
        <div className="text-center">
          <div className="mx-auto mb-4 size-8 animate-spin rounded-full border-2 border-line border-t-ink" />
          <p className="text-sm text-muted">Loading board…</p>
        </div>
      </div>
    );
  }

  if (boardError) {
    return (
      <div className="flex h-screen items-center justify-center bg-canvas px-6">
        <div className="max-w-sm text-center">
          <h2 className="text-xl font-semibold text-ink">Board not found</h2>
          <p className="mt-2 text-sm text-muted">
            This board doesn't exist or you don't have access to it.
          </p>
          <Button onClick={() => navigate("/boards")} className="mt-5">
            Back to boards
          </Button>
        </div>
      </div>
    );
  }

  const isOwner = user && board && user.id === board.ownerId;

  const handleZoomIn = () => {
    userZoomedRef.current = true;
    const { maxScale } = getScaleBounds();
    setScale((s) => parseFloat(Math.min(maxScale, parseFloat((s + 0.1).toFixed(2))).toFixed(2)));
  };
  const handleZoomOut = () => {
    userZoomedRef.current = true;
    const { minScale } = getScaleBounds();
    setScale((s) => parseFloat(Math.max(minScale, parseFloat((s - 0.1).toFixed(2))).toFixed(2)));
  };
  const handleResetZoom = () => {
    userZoomedRef.current = true;
    const { minScale, maxScale } = getScaleBounds();
    setScale(() => Math.max(minScale, Math.min(maxScale, 1)));
    setStagePosition({ x: 0, y: 0 });
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-canvas">
      {/* Top bar */}
      <header className="z-20 flex h-14 shrink-0 items-center gap-2 border-b border-hairline bg-surface/90 px-3 backdrop-blur-md sm:px-4">
        <IconButton icon={ArrowLeft} label="Back to boards" onClick={() => navigate("/dashboard")} />

        <button
          onClick={() => isOwner && setShowRename(true)}
          disabled={!isOwner}
          className={cn(
            "group flex min-w-0 items-center gap-1.5 rounded-lg px-2 py-1.5 text-left",
            isOwner && "hover:bg-sunken"
          )}
          title={isOwner ? "Rename board" : undefined}
        >
          <span className="truncate text-[15px] font-semibold tracking-tight text-ink">
            {board?.title || "Loading…"}
          </span>
          {isOwner && (
            <Pencil className="size-3.5 shrink-0 text-faint opacity-0 transition-opacity group-hover:opacity-100" />
          )}
        </button>

        <div className="ml-auto flex items-center gap-2">
          {/* Presence */}
          <div className="hidden items-center gap-2 sm:flex">
            {online.length > 0 && <AvatarGroup users={online.map((u) => u.user || u)} size="sm" max={4} />}
            <span className="inline-flex items-center gap-1.5 rounded-full bg-positive-soft px-2 py-1 text-xs font-medium text-positive">
              <span className="size-1.5 rounded-full bg-positive" />
              {online.length} online
            </span>
          </div>

          <Tooltip label="Export as PNG">
            <IconButton icon={Download} label="Export as PNG" onClick={handleExport} />
          </Tooltip>

          <Tooltip label="Voice room">
            <IconButton
              icon={Mic}
              label="Voice room"
              onClick={() => setPanel((p) => (p === "voice" ? null : "voice"))}
              className={cn(panel === "voice" && "bg-sunken text-ink")}
            />
          </Tooltip>

          <IconButton
            icon={PanelRightOpen}
            label="Activity & members"
            onClick={() => setPanel((p) => (p ? null : "activity"))}
            className={cn(panel && panel !== "voice" && "bg-sunken text-ink")}
          />

          <Button icon={Share2} size="sm" onClick={() => setShowShareModal(true)} className="hidden sm:inline-flex">
            Share
          </Button>
          <IconButton icon={Share2} label="Share" variant="ink" onClick={() => setShowShareModal(true)} className="sm:hidden" />

          <IconButton
            icon={HelpCircle}
            label="Help"
            onClick={() => setShowMobileHelpModal(true)}
            className="lg:hidden"
          />
        </div>
      </header>

      {/* Body */}
      <div className="relative flex min-h-0 flex-1 overflow-hidden">
        <div ref={containerRef} className="relative min-w-0 flex-1 bg-canvas">
          {/* Floating contextual toolbar — add note + color swatches.
              Hidden for viewers/commenters who can't create notes. */}
          {canEdit && (
            <div className="absolute left-4 top-1/2 z-10 -translate-y-1/2 lg:block">
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-hairline bg-surface p-2 shadow-card">
                <Tooltip label={joined ? "Add note" : "Connecting…"} side="right">
                  <button
                    onClick={addNoteAtCenter}
                    disabled={!joined}
                    className="flex size-11 items-center justify-center rounded-xl bg-ink text-ink-contrast shadow-soft transition-transform hover:scale-[1.04] active:scale-95 disabled:opacity-40"
                    aria-label="Add note"
                  >
                    <Plus className="size-5" strokeWidth={2.25} />
                  </button>
                </Tooltip>
                <div className="h-px w-7 bg-hairline" />
                <div className="flex flex-col gap-1.5">
                  {NOTE_COLORS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setDraftColor(c)}
                      aria-label={`Note color ${c}`}
                      className={cn(
                        "size-6 rounded-full border transition-transform hover:scale-110",
                        draftColor === c ? "ring-2 ring-ink ring-offset-2 ring-offset-surface" : "border-black/5"
                      )}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Read-only banner for viewers / commenters */}
          {joined && !canEdit && (
            <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full border border-hairline bg-surface/90 px-3 py-1.5 text-xs font-medium text-muted shadow-soft backdrop-blur-sm">
              {roleMeta(role).label} access · view only
            </div>
          )}

          {canvasSize.width > 0 && canvasSize.height > 0 && (
            <div className="absolute inset-0">
              <Stage
                ref={stageRef}
                width={canvasSize.width}
                height={canvasSize.height}
                scaleX={scale}
                scaleY={scale}
                x={stagePosition.x}
                y={stagePosition.y}
                draggable={true}
                onDragStart={(e) => setDragStartTarget(e.target)}
                onDragEnd={(e) => {
                  if (dragStartTarget === e.target.getStage()) {
                    setStagePosition({ x: e.target.x(), y: e.target.y() });
                  }
                  setDragStartTarget(null);
                }}
                onWheel={(e) => {
                  e.evt.preventDefault();
                  const scaleBy = 1.1;
                  const stage = e.target.getStage();
                  const oldScale = stage.scaleX();
                  const pointer = stage.getPointerPosition();
                  const mousePointTo = {
                    x: (pointer.x - stage.x()) / oldScale,
                    y: (pointer.y - stage.y()) / oldScale,
                  };
                  let newScale = e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
                  const { minScale, maxScale } = getScaleBounds();
                  newScale = parseFloat(Math.max(minScale, Math.min(maxScale, newScale)).toFixed(2));
                  userZoomedRef.current = true;
                  setScale(newScale);
                  setStagePosition({
                    x: pointer.x - mousePointTo.x * newScale,
                    y: pointer.y - mousePointTo.y * newScale,
                  });
                }}
                onMouseDown={(e) => {
                  if (e.target === e.target.getStage()) {
                    setActiveNoteId(null);
                    if (e.evt.button === 1) setIsMiddlePanning(true);
                    const container = stageRef.current?.container();
                    if (container && (isPanning || e.evt.button === 1)) container.style.cursor = "grabbing";
                  } else {
                    const stage = stageRef.current;
                    if (stage) {
                      e.cancelBubble = true;
                      if (!("ontouchstart" in window)) {
                        stage.draggable(false);
                      }
                    }
                  }
                }}
                onMouseUp={() => {
                  setIsMiddlePanning(false);
                  const stage = stageRef.current;
                  if (stage) stage.draggable(true);
                  const container = stageRef.current?.container();
                  if (container) container.style.cursor = isPanning ? "grab" : "default";
                }}
                onMouseEnter={() => {
                  const container = stageRef.current?.container();
                  if (container && (isPanning || isMiddlePanning)) container.style.cursor = "grab";
                }}
                onMouseLeave={() => {
                  setIsMiddlePanning(false);
                  const container = stageRef.current?.container();
                  if (container) container.style.cursor = "default";
                }}
                onTouchStart={(e) => {
                  if (e.evt.touches.length === 1) {
                    if (e.target === e.target.getStage()) {
                      setActiveNoteId(null);
                    }
                  }
                }}
              >
                <Layer>
                  {notes.map((note) => (
                    <Note
                      key={note.id}
                      note={note}
                      canEdit={canEdit}
                      canComment={canComment}
                      mentionPeople={mentionPeople}
                      onOpenComments={openComments}
                      onDragEnd={(e) => handleNoteDragEnd(e, note)}
                      activeNoteId={activeNoteId}
                      setActiveNoteId={setActiveNoteId}
                      onRequestDelete={requestDeleteNote}
                      onOptimisticUpdate={updateNote}
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
          )}

          {/* Empty state */}
          {notes.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="max-w-xs rounded-2xl border border-hairline bg-surface/90 px-6 py-7 text-center shadow-card backdrop-blur-sm">
                <div className="mx-auto mb-3 flex size-11 items-center justify-center rounded-xl bg-sunken text-muted">
                  <Plus className="size-5" strokeWidth={2} />
                </div>
                <h3 className="text-sm font-semibold text-ink">Start creating</h3>
                <p className="mt-1 text-sm text-muted">
                  Use the <span className="font-medium text-ink">+</span> button to add your first note.
                </p>
              </div>
            </div>
          )}

          {/* Floating zoom controls (bottom-right) */}
          <div className="absolute bottom-4 right-4 z-10 flex items-center rounded-xl border border-hairline bg-surface p-1 shadow-card">
            <IconButton icon={ZoomOut} label="Zoom out" size="sm" onClick={handleZoomOut} />
            <span className="w-12 text-center text-xs font-medium text-muted">{Math.round(scale * 100)}%</span>
            <IconButton icon={ZoomIn} label="Zoom in" size="sm" onClick={handleZoomIn} />
            <span className="mx-0.5 h-5 w-px bg-hairline" />
            <IconButton icon={RotateCcw} label="Reset view" size="sm" onClick={handleResetZoom} />
          </div>

          {/* Controls hint (desktop) */}
          <div className="pointer-events-none absolute bottom-4 left-4 z-10 hidden rounded-xl border border-hairline bg-surface/90 px-3 py-2 text-xs text-muted shadow-soft backdrop-blur-sm lg:block">
            <span className="font-medium text-ink-soft">Scroll</span> to zoom ·{" "}
            <span className="font-medium text-ink-soft">Drag</span> to pan ·{" "}
            <span className="font-medium text-ink-soft">Double-click</span> to edit ·{" "}
            <span className="font-medium text-ink-soft">Del</span> to remove ·{" "}
            <span className="font-medium text-ink-soft">Ctrl+D</span> to duplicate
          </div>
        </div>

        {/* Right panel slide-over */}
        {panel && (
          <>
            <div
              className="absolute inset-0 z-30 bg-ink/20 backdrop-blur-[1px] sm:hidden"
              onClick={() => setPanel(null)}
            />
            <aside className="absolute inset-y-0 right-0 z-40 w-full border-l border-hairline shadow-pop animate-slide-in-right sm:static sm:z-auto sm:w-96 sm:shadow-none">
              <BoardPanel
                boardId={boardId}
                board={board}
                online={online}
                initialTab={panel}
                commentNote={notes.find((n) => n.id === activeNoteId) || null}
                canComment={canComment}
                canManage={isOwner || canManageMembersRole(role)}
                onClose={() => setPanel(null)}
              />
            </aside>
          </>
        )}
      </div>

      <ShareModal
        open={showShareModal}
        onClose={() => setShowShareModal(false)}
        boardId={boardId}
        board={board}
      />
      <RenameBoardModal board={board} open={showRename} onClose={() => setShowRename(false)} />
      <MobileHelpModal isOpen={showMobileHelpModal} onClose={() => setShowMobileHelpModal(false)} />
    </div>
  );
}
