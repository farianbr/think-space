import { Mic, MicOff, Hand, PhoneCall } from "lucide-react";
import { Avatar, Button, Badge } from "../ui";
import { displayName } from "../../lib/format";

/**
 * FaceTime-inspired voice room — elegant and lightweight. The realtime audio
 * layer (WebRTC) is deferred, so controls are present but disabled and clearly
 * labelled "coming soon".
 */
export default function VoiceRoomPanel({ online = [] }) {
  const participants = online.map((u) => (u?.user ? u.user : u)).filter(Boolean);

  return (
    <div className="flex flex-col gap-5 p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-ink">Voice room</h3>
          <Badge variant="outline">Coming soon</Badge>
        </div>
      </div>

      <div className="rounded-2xl border border-hairline bg-surface p-5">
        {participants.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted">
            No one's in the room yet.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-3">
            {participants.slice(0, 9).map((p, i) => (
              <div key={p.id || i} className="flex flex-col items-center gap-1.5">
                <span className="relative">
                  <Avatar user={p} size="lg" />
                  <span className="absolute -bottom-1 -right-1 flex size-5 items-center justify-center rounded-full border border-surface bg-sunken text-faint">
                    <MicOff className="size-3" strokeWidth={2} />
                  </span>
                </span>
                <span className="max-w-full truncate text-[11px] text-muted">
                  {displayName(p)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Controls (disabled placeholder) */}
      <div className="flex items-center justify-center gap-2">
        <Button variant="secondary" size="sm" icon={Mic} disabled>
          Mute
        </Button>
        <Button variant="secondary" size="sm" icon={Hand} disabled>
          Raise hand
        </Button>
      </div>
      <Button icon={PhoneCall} disabled className="justify-center">
        Join voice room
      </Button>
      <p className="text-center text-xs text-faint">
        Live voice collaboration is on the way.
      </p>
    </div>
  );
}
