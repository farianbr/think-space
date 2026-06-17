import { Mic, MicOff, PhoneCall, PhoneOff } from "../../lib/icons";
import { Avatar, Button } from "../ui";
import { useAuth } from "../../contexts/authContext";
import { displayName } from "../../lib/format";
import useVoiceRoom from "../../hooks/useVoiceRoom";
import { cn } from "../../lib/cn";

/**
 * Live P2P voice room. Joining captures the mic and connects to other
 * participants over WebRTC (mesh). Audio plays through hidden elements managed
 * by useVoiceRoom; this component renders the roster and controls.
 */
export default function VoiceRoomPanel({ boardId }) {
  const { user } = useAuth();
  const { joined, joining, muted, participants, error, join, leave, toggleMute } =
    useVoiceRoom(boardId);

  // Show self first when connected, then remote peers.
  const roster = joined
    ? [{ socketId: "self", user, muted, self: true }, ...participants]
    : participants;

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ink">Voice room</h3>
        {joined && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-positive-soft px-2 py-1 text-xs font-medium text-positive">
            <span className="size-1.5 rounded-full bg-positive" />
            Connected
          </span>
        )}
      </div>

      <div className="rounded-2xl border border-hairline bg-surface p-5">
        {roster.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            {joined ? "You're the only one here." : "No one's in the room yet."}
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {roster.map((p) => (
              <div key={p.socketId} className="flex flex-col items-center gap-1.5">
                <span className="relative">
                  <Avatar user={p.user} size="lg" />
                  <span
                    className={cn(
                      "absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border border-surface",
                      p.muted ? "bg-sunken text-faint" : "bg-positive text-white"
                    )}
                  >
                    {p.muted ? (
                      <MicOff className="size-3" strokeWidth={2} />
                    ) : (
                      <Mic className="size-3" strokeWidth={2} />
                    )}
                  </span>
                </span>
                <span className="max-w-full truncate text-[11px] text-muted">
                  {p.self ? "You" : displayName(p.user)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {error && <p className="text-center text-xs text-danger">{error}</p>}

      {joined ? (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            icon={muted ? MicOff : Mic}
            onClick={toggleMute}
            className={cn(muted && "text-danger")}
          >
            {muted ? "Unmute" : "Mute"}
          </Button>
          <Button variant="danger" size="sm" icon={PhoneOff} onClick={leave}>
            Leave
          </Button>
        </div>
      ) : (
        <Button icon={PhoneCall} onClick={join} loading={joining} className="justify-center">
          {joining ? "Connecting…" : "Join voice room"}
        </Button>
      )}

      <p className="text-center text-xs text-faint">
        Peer-to-peer audio · best with a few people on the call.
      </p>
    </div>
  );
}
