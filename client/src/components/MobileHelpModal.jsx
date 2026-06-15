import { Hand, StickyNote, MousePointerClick } from "lucide-react";
import { Modal, Button } from "./ui";

const GROUPS = [
  {
    icon: StickyNote,
    title: "Notes",
    rows: [
      ["Single tap", "Show controls"],
      ["Double tap", "Edit text"],
      ["Drag", "Move around"],
      ["Corner handle", "Resize"],
    ],
  },
  {
    icon: Hand,
    title: "Navigation",
    rows: [
      ["One-finger drag", "Pan the board"],
      ["Pinch", "Zoom in / out"],
      ["Tap empty area", "Hide controls"],
    ],
  },
];

export default function MobileHelpModal({ isOpen, onClose }) {
  return (
    <Modal
      open={isOpen}
      onClose={onClose}
      title="How to use the canvas"
      size="sm"
      footer={
        <Button onClick={onClose} className="w-full justify-center">
          Got it
        </Button>
      }
    >
      <div className="space-y-5">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-ink">
              <g.icon className="size-4 text-muted" strokeWidth={2} aria-hidden />
              {g.title}
            </h3>
            <dl className="space-y-1.5">
              {g.rows.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between text-sm">
                  <dt className="font-medium text-ink-soft">{k}</dt>
                  <dd className="text-muted">{v}</dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
        <div className="flex items-center gap-2 rounded-lg bg-sunken p-3 text-xs text-muted">
          <MousePointerClick className="size-4 shrink-0" aria-hidden />
          Tip: use the color swatches on the left toolbar to pick a note color before adding.
        </div>
      </div>
    </Modal>
  );
}
