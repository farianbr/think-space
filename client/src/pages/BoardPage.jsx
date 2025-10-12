import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Stage, Layer } from "react-konva";
import { toast } from "react-hot-toast";
import {
  ArrowLeft,
  Plus,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Users,
  UserPlus,
  X,
  Circle,
  Menu,
  MoreHorizontal,
  HelpCircle,
} from "lucide-react";

import { connectSocket, socket } from "../lib/socket";
import { fetchBoard, fetchNotes } from "../lib/api";
import { throttle } from "../lib/throttle";
import { useAuth } from "../contexts/authContext";

import Note from "../components/Note";
import ActiveUsers from "../components/ActiveUsers";
import MembersList from "../components/MembersList";
import InviteModal from "../components/InviteModal";
import MobileHelpModal from "../components/MobileHelpModal";
import useOnlineMembers from "../hooks/useOnlineMembers";
import useMembersSocket from "../hooks/useMembersSocket";

export default function BoardPage() {
  const { boardId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [notes, setNotes] = useState([]);
  const [joined, setJoined] = useState(false);
  const [showMembersPanel, setShowMembersPanel] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showMobileHelpModal, setShowMobileHelpModal] = useState(false);
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
      // Mobile: 10% - 200%
      return { minScale: 0.1, maxScale: 2.0 };
    }
    // Desktop: 50% - 300% (existing behavior)
    return { minScale: 0.5, maxScale: 3.0 };
  };

  // Initial mobile scale: apply a gentle scale on small screens once canvas size is known.
  // This hook is unconditional and runs early to keep hook ordering consistent.
  useEffect(() => {
    if (!canvasSize.width || !canvasSize.height) return;
    if (userZoomedRef.current) return; // respect user preference

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

    // Initial size calculation with a small delay to ensure DOM is ready
    const timeoutId = setTimeout(updateSize, 50);
    updateSize();

    window.addEventListener("resize", updateSize);
    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener("resize", updateSize);
    };
  }, []); // Remove showMembersPanel dependency

  // Close mobile menu on resize to desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth >= 1024) {
        setShowMobileMenu(false);
        setShowMobileHelpModal(false);
      }
    }

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Force Stage re-render when notes change to ensure proper rendering
  useEffect(() => {
    if (notes.length > 0) {
      // Force canvas size recalculation and Stage update
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

      // Multiple attempts to ensure size is captured
      updateSize();
      setTimeout(updateSize, 100);
      setTimeout(updateSize, 300);
    }
  }, [board]);

  // Apply fallback notes once (only the earliest source wins)
  useEffect(() => {
    // Apply REST fallback only before we have successfully joined
    if (!joinedRef.current && Array.isArray(notesFallback)) {
      setNotes(notesFallback);
    }
  }, [notesFallback]);

  useEffect(() => {
    if (!boardId || !user) return;

    // Reset state when switching boards or users
    setJoined(false);
    joinedRef.current = false;

    connectSocket();

    function ensureJoin() {
      if (joinedRef.current) return; // already joined

      // Add a small delay to ensure socket is fully connected
      setTimeout(() => {
        socket.emit("board:join", boardId, (response) => {
          if (response && response.ok) {
            // Always set notes from socket snapshot (authoritative)
            setNotes(response.notes || []);
            setJoined(true);
            if (!joinedRef.current) {
              toast.success("Connected to board");
            }
            joinedRef.current = true;
          } else {
            if (
              response &&
              (response.status === 403 || response.status === 404)
            ) {
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

    // Cancel any scheduled leave from a prior StrictMode cleanup
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
      // Schedule leave; if component remounts immediately (StrictMode dev), the next effect will cancel this
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

  // Touch events for mobile panning - simplified approach
  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const handleTouchStart = (e) => {
      if (e.touches.length === 1) {
        // Single finger - enable stage dragging
        const pos = stage.getPointerPosition();
        const clickedOnStage = stage === stage.getIntersection(pos);

        if (clickedOnStage) {
          stage.draggable(true);
        }
      } else {
        // Multiple fingers - disable stage dragging for pinch zoom
        stage.draggable(false);
      }
    };

    const handleTouchEnd = () => {
      // Re-enable/disable stage dragging based on current state
      stage.draggable(isPanning);
    };

    if (containerRef.current) {
      const container = containerRef.current;
      container.addEventListener("touchstart", handleTouchStart, {
        passive: true,
      });
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
      if (!p || p.boardId !== boardId) return;
      // Ignore server echoes for notes created by this socket - we already
      // inserted an optimistic note locally. Server includes socketId in payload.
      if (p.socketId && p.socketId === socket.id) return;
      setNotes((prev) => [...prev, p.note]);
    }
    function onNoteUpdated(p) {
      if (!p || p.boardId !== boardId || p.socketId === socket.id) return;
      setNotes((prev) => prev.map((n) => (n.id === p.note.id ? p.note : n)));
    }
    function onNoteDeleted(p) {
      if (!p || p.boardId !== boardId) return;
      setNotes((prev) => prev.filter((n) => n.id !== p.noteId));
    }
    socket.on("note:created", onNoteCreated);
    socket.on("note:updated", onNoteUpdated);
    socket.on("note:deleted", onNoteDeleted);
    return () => {
      socket.off("note:created", onNoteCreated);
      socket.off("note:updated", onNoteUpdated);
      socket.off("note:deleted", onNoteDeleted);
    };
  }, [boardId]);

  // Create note at specified position (throttled)
  const createNote = throttle((x, y) => {
    if (!boardId || !joined) return;

    const newNote = {
      text: "",
      x: Math.max(20, Math.min(x - 70, canvasSize.width - 160)),
      y: Math.max(20, Math.min(y - 45, canvasSize.height - 110)),
      color: "#fef3c7",
      width: 180,
      height: 120,
    };

    // Emit create request to server
    socket.emit("note:create", boardId, newNote, (ack) => {
      if (ack && ack.ok && ack.note) {
        // Directly update local state when server confirms
        setNotes((prev) => [...prev, ack.note]);
      } else {
        toast.error(ack?.message || "Failed to create note");
      }
    });
  }, 200);

  // Request note deletion (with server confirmation)
  const requestDeleteNote = (noteId) => {
    if (!boardId || !joined) return;

    socket.emit("note:delete", boardId, noteId, (ack) => {
      if (ack && ack.ok) {
        // Only update UI after server confirms deletion
        setNotes((prev) => prev.filter((n) => n.id !== noteId));
      } else {
        toast.error(ack?.message || "Failed to delete note");
      }
    });
  };

  // Optimistic update for text and color changes (similar to drag updates)
  const handleOptimisticUpdate = (noteId, updates) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === noteId ? { ...n, ...updates } : n))
    );
  };

  const handleNoteDragEnd = (e, note) => {
    // Get the actual position where the user dropped the note
    const newX = Math.round(e.target.x());
    const newY = Math.round(e.target.y());

    // Only emit update if position actually changed
    if (newX !== note.x || newY !== note.y) {
      socket.emit("note:update", boardId, note.id, { x: newX, y: newY });
      // Optimistically update position locally for snappier UI
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, x: newX, y: newY } : n))
      );
    }

    // Note: Note component now handles clearing activeNoteId on mobile
  };

  if (boardLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading board...</p>
        </div>
      </div>
    );
  }

  if (boardError) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            Warning
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Board not found
          </h2>
          <p className="text-gray-600 mb-4">
            This board doesn't exist or you don't have access to it.
          </p>
          <button
            onClick={() => navigate("/boards")}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            Back to Boards
          </button>
        </div>
      </div>
    );
  }

  const isOwner = user && board && user.id === board.ownerId;
  const canvasWidth = canvasSize.width; // Remove members panel width calculation
  const handleZoomIn = () => {
    userZoomedRef.current = true;
    const { maxScale } = getScaleBounds();
    setScale((s) =>
      parseFloat(
        Math.min(maxScale, parseFloat((s + 0.1).toFixed(2))).toFixed(2)
      )
    );
  };
  const handleZoomOut = () => {
    userZoomedRef.current = true;
    const { minScale } = getScaleBounds();
    setScale((s) =>
      parseFloat(
        Math.max(minScale, parseFloat((s - 0.1).toFixed(2))).toFixed(2)
      )
    );
  };
  const handleResetZoom = () => {
    userZoomedRef.current = true;
    const { minScale, maxScale } = getScaleBounds();
    // reset to 1 but clamp into bounds
    setScale(() => Math.max(minScale, Math.min(maxScale, 1)));
    setStagePosition({ x: 0, y: 0 });
  };

  return (
    <div className="h-screen flex bg-gray-50">
      <div className="flex-1 flex overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 relative bg-gradient-to-br from-blue-50 via-white to-indigo-50"
        >
          {/* Mobile header bar */}
          <div className="absolute top-0 left-0 right-0 z-20 lg:hidden">
            <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => navigate("/boards")}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors flex items-center gap-2"
                  title="Back to boards"
                >
                  <ArrowLeft size={20} />
                </button>

                {/* Board title */}
                <div className="flex flex-col">
                  <h1 className="text-lg font-bold text-gray-900 truncate max-w-[200px]">
                    {board?.title || "Loading..."}
                  </h1>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Online indicator - mobile */}
                <div className="flex items-center gap-1 px-2 py-1 bg-green-50 border border-green-200 rounded-md">
                  <Circle size={6} className="text-green-500 fill-current" />
                  <span className="text-xs text-green-700 font-medium">
                    {online.length}
                  </span>
                </div>

                {/* Help button - mobile */}
                <button
                  onClick={() => {
                    setShowMobileHelpModal(true);
                    setShowMobileMenu(false); // Close menu when opening help
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
                  title="Help"
                >
                  <HelpCircle size={18} />
                </button>

                {/* Mobile menu toggle */}
                <button
                  onClick={() => {
                    setShowMobileMenu(!showMobileMenu);
                  }}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
                >
                  <Menu size={20} />
                </button>
              </div>
            </div>

            {/* Mobile menu dropdown */}
            {showMobileMenu && (
              <div className="absolute top-full left-0 right-0 bg-white border-b border-gray-200 shadow-lg">
                <div className="p-4 space-y-3">
                  {/* Zoom controls moved to a floating mobile widget (see below) */}

                  {/* Actions - mobile */}
                  <div className="flex gap-2">
                    {isOwner && (
                      <button
                        onClick={() => {
                          setShowInviteModal(true);
                          setShowMobileMenu(false);
                        }}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        <UserPlus size={16} />
                        Add
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowMembersPanel(true);
                        setShowMobileMenu(false);
                      }}
                      className="flex-1 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-3 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                    >
                      <Users size={16} />
                      Members
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Desktop back button and title - floating in top-left */}
          <div className="absolute top-4 left-4 z-10 hidden lg:block">
            <div className="flex items-center gap-5 bg-white/80 backdrop-blur-md border border-gray-100 shadow-sm rounded-xl px-6 py-4 transition-all duration-300 hover:shadow-md">
              <button
                onClick={() => navigate("/boards")}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-300 hover:shadow-sm transition-all duration-200 font-medium"
                title="Back to boards"
              >
                <ArrowLeft className="w-4 h-4" strokeWidth={2.5} />
                <span>Back</span>
              </button>

              <div className="ml-2 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-gray-400/80" />
                <h1 className="text-3xl lg:text-4xl font-semibold text-gray-900 tracking-tight truncate font-[Inter]">
                  {board?.title || "Loading..."}
                </h1>
              </div>
            </div>
          </div>

          {/* Desktop floating toolbar - top-right */}
          <div className="absolute top-4 right-4 z-10 hidden lg:flex items-center space-x-3">
            {/* Online users indicator */}
            <div className="flex items-center space-x-2 px-3 py-2 bg-white border border-gray-200 rounded-lg shadow-lg">
              <Circle size={8} className="text-green-500 fill-current" />
              <span className="text-sm text-green-700 font-medium">
                {online.length} online
              </span>
            </div>

            {/* Zoom controls */}
            <div className="flex items-center bg-white rounded-lg overflow-hidden border border-gray-200 shadow-lg">
              <button
                onClick={handleZoomOut}
                className="px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <ZoomOut size={16} />
              </button>
              <div className="px-3 py-2 text-sm text-gray-700 border-x border-gray-200">
                {Math.round(scale * 100)}%
              </div>
              <button
                onClick={handleZoomIn}
                className="px-3 py-2 text-gray-700 hover:bg-gray-50 flex items-center"
              >
                <ZoomIn size={16} />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-3 py-2 text-gray-500 hover:bg-gray-50 border-l border-gray-200 flex items-center"
                title="Reset zoom"
              >
                <RotateCcw size={16} />
              </button>
            </div>

            {/* Board actions */}
            {isOwner && (
              <button
                onClick={() => setShowInviteModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg shadow-lg font-medium transition-colors flex items-center gap-2"
              >
                <UserPlus size={16} />
                Add
              </button>
            )}

            <button
              onClick={() => setShowMembersPanel(!showMembersPanel)}
              className={`px-4 py-2 rounded-lg font-medium shadow-lg transition-colors flex items-center gap-2 ${
                showMembersPanel
                  ? "bg-gray-800 text-white"
                  : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-200"
              }`}
            >
              <Users size={16} />
              Members
            </button>
          </div>

          {/* Floating Add Note button - responsive: mobile bottom-right (lower), desktop left-center */}
          <div className="absolute z-10 right-6 bottom-16 lg:left-4 lg:top-1/2 lg:transform lg:-translate-y-1/2 lg:right-auto">
            <div className="flex lg:flex-col items-center lg:items-center space-x-3 lg:space-x-0 lg:space-y-3 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
              <button
                onClick={() => {
                  if (!joined) return;

                  let centerX, centerY;

                  if (
                    stageRef.current &&
                    stageRef.current.width() > 0 &&
                    stageRef.current.height() > 0
                  ) {
                    const stage = stageRef.current;
                    centerX = (stage.width() / 2 - stagePosition.x) / scale;
                    centerY = (stage.height() / 2 - stagePosition.y) / scale;
                  } else {
                    centerX =
                      canvasSize.width > 0
                        ? (canvasSize.width / 2 - stagePosition.x) / scale
                        : 200;
                    centerY =
                      canvasSize.height > 0
                        ? (canvasSize.height / 2 - stagePosition.y) / scale
                        : 200;
                  }

                  createNote(centerX, centerY);
                }}
                disabled={!joined}
                title={!joined ? "Connecting..." : "Add Note"}
                className="relative inline-flex items-center gap-2 px-3 py-2 lg:px-4 lg:py-2.5 rounded-xl font-medium text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-[0_4px_14px_0_rgba(59,130,246,0.35)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
              >
                <Plus size={18} className="stroke-[2.5]" />
                <span className="hidden lg:inline">Add Note</span>
              </button>

              {/* Placeholder for future tools - hidden on mobile */}
              <div className="text-xs text-gray-400 text-center hidden lg:block">
                More tools coming soon
              </div>
            </div>
          </div>
          {canvasSize.width > 0 && canvasSize.height > 0 && (
            <div className="absolute inset-0 pt-16 lg:pt-0">
              <Stage
                key={`stage-${notes.length}`} // Force re-mount when notes change
                ref={stageRef}
                width={canvasWidth}
                height={
                  canvasSize.height -
                  (typeof window !== "undefined" && window.innerWidth < 1024
                    ? 64
                    : 0)
                } // Account for mobile header
                scaleX={scale}
                scaleY={scale}
                x={stagePosition.x}
                y={stagePosition.y}
                draggable={true} // Always enable dragging, but control it via touch/mouse events
                onDragStart={(e) => {
                  setDragStartTarget(e.target);
                }}
                onDragEnd={(e) => {
                  // Only update stage position if drag started on Stage background
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

                  let newScale =
                    e.evt.deltaY > 0 ? oldScale / scaleBy : oldScale * scaleBy;
                  const { minScale, maxScale } = getScaleBounds();
                  newScale = parseFloat(
                    Math.max(minScale, Math.min(maxScale, newScale)).toFixed(2)
                  );
                  userZoomedRef.current = true;

                  setScale(newScale);

                  const newPos = {
                    x: pointer.x - mousePointTo.x * newScale,
                    y: pointer.y - mousePointTo.y * newScale,
                  };

                  setStagePosition(newPos);
                }}
                onMouseDown={(e) => {
                  // Only enable stage dragging if clicking on empty background
                  if (e.target === e.target.getStage()) {
                    if (e.evt.button === 1) setIsMiddlePanning(true); // middle click
                    const container = stageRef.current?.container();
                    if (container && (isPanning || e.evt.button === 1))
                      container.style.cursor = "grabbing";
                  } else {
                    // Clicked on a note - disable stage dragging temporarily
                    const stage = stageRef.current;
                    if (stage) {
                      e.cancelBubble = true;
                      // Don't prevent stage dragging on mobile for notes
                      if (!("ontouchstart" in window)) {
                        stage.draggable(false);
                      }
                    }
                  }
                }}
                onMouseUp={() => {
                  setIsMiddlePanning(false);
                  // Re-enable stage dragging
                  const stage = stageRef.current;
                  if (stage) stage.draggable(true);

                  const container = stageRef.current?.container();
                  if (container)
                    container.style.cursor = isPanning ? "grab" : "default";
                }}
                onMouseEnter={() => {
                  const container = stageRef.current?.container();
                  if (container && (isPanning || isMiddlePanning))
                    container.style.cursor = "grab";
                }}
                onMouseLeave={() => {
                  setIsMiddlePanning(false);
                  const container = stageRef.current?.container();
                  if (container) container.style.cursor = "default";
                }}
                onTouchStart={(e) => {
                  // Handle touch events for mobile
                  if (e.evt.touches.length === 1) {
                    // Single finger tap on background
                    if (e.target === e.target.getStage()) {
                      setShowMobileMenu(false); // Hide mobile menu when tapping canvas
                      setActiveNoteId(null); // Hide any active note controls
                    }
                  }
                }}
              >
                <Layer>
                  {notes.map((note) => (
                    <Note
                      key={note.id}
                      note={note}
                      boardId={boardId}
                      onDragEnd={(e) => handleNoteDragEnd(e, note)}
                      activeNoteId={activeNoteId}
                      setActiveNoteId={setActiveNoteId}
                      onRequestDelete={requestDeleteNote}
                      onOptimisticUpdate={handleOptimisticUpdate}
                    />
                  ))}
                </Layer>
              </Stage>
            </div>
          )}

          {/* Help overlay - bottom left - hidden on mobile */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg pointer-events-none select-none z-10 hidden lg:block">
            <h4 className="text-xs font-semibold text-gray-800 mb-2">
              Controls
            </h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div>
                <span className="font-medium">Mouse wheel:</span> Zoom in/out
              </div>
              <div>
                <span className="font-medium">Click + drag:</span> Pan board
              </div>
              <div>
                <span className="font-medium">Double click note:</span> Edit
                text
              </div>
              <div>
                <span className="font-medium">Drag corner:</span> Resize note
              </div>
            </div>
          </div>

          {/* Mobile floating zoom controls - left-bottom pill sized to match Add Note on mobile */}
          <div className="fixed bottom-6 left-6 z-50 lg:hidden">
            <div className="bg-white/95 border border-gray-200 rounded-xl shadow-[0_6px_20px_rgba(0,0,0,0.08)] px-2 py-2 flex items-center space-x-3">
              <button
                onClick={handleZoomOut}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700"
                aria-label="Zoom out"
              >
                <ZoomOut size={18} />
              </button>
              <div className="text-sm text-gray-700 px-1">
                {Math.round(scale * 100)}%
              </div>
              <button
                onClick={handleZoomIn}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700"
                aria-label="Zoom in"
              >
                <ZoomIn size={18} />
              </button>
              <button
                onClick={handleResetZoom}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-white hover:bg-gray-50 text-gray-700"
                aria-label="Reset zoom"
              >
                <RotateCcw size={18} />
              </button>
            </div>
          </div>

          {notes.length === 0 && (
            <div className="absolute inset-0 pt-16 lg:pt-0 flex items-center justify-center pointer-events-none">
              <div className="text-center bg-white/80 backdrop-blur-sm rounded-xl p-6 lg:p-8 shadow-lg border border-gray-200 mx-4">
                <div className="text-3xl mb-2">💡</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Start Creating
                </h3>
                <p className="text-gray-600 mb-2 text-sm lg:text-base">
                  <span className="hidden lg:inline">
                    Use the + button on the left to create your first note
                  </span>
                  <span className="lg:hidden">
                    Tap the + button to add your first note
                  </span>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Members Sidebar */}
        {showMembersPanel && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-sm bg-opacity-50 z-40"
              onClick={() => setShowMembersPanel(false)}
            />

            {/* Sidebar */}
            <div className="fixed top-0 right-0 h-full w-full sm:w-96 lg:w-80 bg-white shadow-xl z-50 flex flex-col">
              <div className="p-4 border-b border-gray-200 flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Users size={20} />
                  Team
                </h2>
                <button
                  onClick={() => setShowMembersPanel(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                <div className="p-4 border-b border-gray-100">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Circle size={8} className="text-green-500 fill-current" />
                    Active Now
                  </h3>
                  <ActiveUsers activeList={online} />
                </div>
                <div className="p-4">
                  <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                    <Users size={16} />
                    All Members
                  </h3>
                  <MembersList
                    boardId={boardId}
                    boardOwnerId={board && board.ownerId}
                  />
                </div>
              </div>
            </div>
          </>
        )}
      </div>
      <InviteModal
        isOpen={showInviteModal}
        onClose={() => setShowInviteModal(false)}
        boardId={boardId}
      />
      <MobileHelpModal
        isOpen={showMobileHelpModal}
        onClose={() => setShowMobileHelpModal(false)}
      />
    </div>
  );
}
