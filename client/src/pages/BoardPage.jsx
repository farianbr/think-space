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
} from "lucide-react";

import { connectSocket, socket } from "../lib/socket";
import { fetchBoard, fetchNotes } from "../lib/api";
import { throttle } from "../lib/throttle";
import { useAuth } from "../contexts/authContext";

import Note from "../components/Note";
import ActiveUsers from "../components/ActiveUsers";
import MembersList from "../components/MembersList";
import InviteModal from "../components/InviteModal";
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
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  const [scale, setScale] = useState(1);
  const [stagePosition, setStagePosition] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [isMiddlePanning, setIsMiddlePanning] = useState(false);
  const [dragStartTarget, setDragStartTarget] = useState(null);
  const stageRef = useRef();
  const containerRef = useRef();
  const joinedRef = useRef(false);
  const leaveTimerRef = useRef(null);

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

  console.log(notesFallback);

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

  useEffect(() => {
    if (!boardId) return;
    function onNoteCreated(p) {
      if (!p || p.boardId !== boardId) return;
      setNotes((prev) => [...prev, p.note]);
    }
    function onNoteUpdated(p) {
      if (!p || p.boardId !== boardId) return;
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

  const createNote = throttle((x, y) => {
    if (!boardId || !joined) return;
    const newNote = {
      text: "",
      x: Math.max(20, Math.min(x - 70, canvasSize.width - 160)),
      y: Math.max(20, Math.min(y - 45, canvasSize.height - 110)),
      color: "#fef3c7",
    };
    socket.emit("note:create", boardId, newNote);
  }, 200);

  // Removed double-click create per request

  const handleNoteDragEnd = (e, note) => {
    // Get the actual position where the user dropped the note
    const newX = Math.round(e.target.x());
    const newY = Math.round(e.target.y());

    // Only emit update if position actually changed
    if (newX !== note.x || newY !== note.y) {
      socket.emit("note:update", boardId, note.id, { x: newX, y: newY });
    }
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
  const handleZoomIn = () =>
    setScale((s) => Math.min(3, parseFloat((s + 0.1).toFixed(2))));
  const handleZoomOut = () =>
    setScale((s) => Math.max(0.5, parseFloat((s - 0.1).toFixed(2))));
  const handleResetZoom = () => {
    setScale(1);
    setStagePosition({ x: 0, y: 0 });
  };

  return (
    <div className="h-screen flex bg-gray-50">
      <div className="flex-1 flex overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 relative bg-gradient-to-br from-blue-50 via-white to-indigo-50"
        >
          {/* Back button - floating in top-left */}
          <div className="absolute top-4 left-4 z-10">
            <button
              onClick={() => navigate("/boards")}
              className="bg-white hover:bg-gray-50 text-gray-600 hover:text-gray-900 p-3 rounded-lg shadow-lg border border-gray-200 transition-all flex items-center gap-2"
              title="Back to boards"
            >
              <ArrowLeft size={20} />
              Back
            </button>
          </div>

          {/* Floating toolbar - top-right */}
          <div className="absolute top-4 right-4 z-10 flex items-center space-x-3">
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
                Invite
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

          {/* Floating Add Note toolbar - left side */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 z-10">
            <div className="flex flex-col items-center space-y-3 bg-white border border-gray-200 rounded-lg shadow-lg p-3">
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
                className="relative inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm text-white bg-gradient-to-r from-blue-600 to-blue-500 shadow-[0_4px_14px_0_rgba(59,130,246,0.35)] hover:shadow-[0_6px_20px_rgba(59,130,246,0.4)] hover:scale-[1.03] active:scale-[0.97] disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 ease-in-out"
              >
                <Plus size={18} className="stroke-[2.5]" />
                <span>Add Note</span>
              </button>

              {/* Placeholder for future tools */}
              <div className="text-xs text-gray-400 text-center">
                More tools coming soon
              </div>
            </div>
          </div>
          {canvasSize.width > 0 && canvasSize.height > 0 && (
            <Stage
              key={`stage-${notes.length}`} // Force re-mount when notes change
              ref={stageRef}
              width={canvasWidth}
              height={canvasSize.height}
              scaleX={scale}
              scaleY={scale}
              x={stagePosition.x}
              y={stagePosition.y}
              draggable={isPanning || isMiddlePanning}
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
                newScale = Math.max(0.5, Math.min(3, newScale));

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
                  if (stage) stage.draggable(false);
                }
              }}
              onMouseUp={() => {
                setIsMiddlePanning(false);
                // Re-enable stage dragging
                const stage = stageRef.current;
                if (stage) stage.draggable(isPanning || isMiddlePanning);

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
            >
              <Layer>
                {notes.map((note) => (
                  <Note
                    key={note.id}
                    note={note}
                    boardId={boardId}
                    onDragEnd={(e) => handleNoteDragEnd(e, note)}
                  />
                ))}
              </Layer>
            </Stage>
          )}

          {/* Help overlay - bottom left */}
          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg p-3 shadow-lg pointer-events-none select-none z-10">
            <h4 className="text-xs font-semibold text-gray-800 mb-2">
              Controls
            </h4>
            <div className="space-y-1 text-xs text-gray-600">
              <div>
                <span className="font-medium">Mouse wheel:</span> Zoom in/out
              </div>
              <div>
                <span className="font-medium">Space + drag:</span> Pan board
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

          {notes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center bg-white/80 backdrop-blur-sm rounded-xl p-8 shadow-lg border border-gray-200">
                <div className="text-3xl mb-2">💡</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Start Creating
                </h3>
                <p className="text-gray-600 mb-2">
                  Use the + button on the left to create your first note
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
              className="fixed inset-0 bg-black bg-opacity-50 z-40"
              onClick={() => setShowMembersPanel(false)}
            />

            {/* Sidebar */}
            <div className="fixed top-0 right-0 h-full w-80 bg-white shadow-xl z-50 flex flex-col">
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
    </div>
  );
}
