import { cn } from "../../lib/cn";

const POS = {
  top: "bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2",
  bottom: "top-[calc(100%+6px)] left-1/2 -translate-x-1/2",
  left: "right-[calc(100%+6px)] top-1/2 -translate-y-1/2",
  right: "left-[calc(100%+6px)] top-1/2 -translate-y-1/2",
  // Edge-aligned variants: anchor the bubble to the trigger's left/right edge
  // instead of centering it, so triggers near a viewport edge don't overflow.
  "top-start": "bottom-[calc(100%+6px)] left-0",
  "top-end": "bottom-[calc(100%+6px)] right-0",
  "bottom-start": "top-[calc(100%+6px)] left-0",
  "bottom-end": "top-[calc(100%+6px)] right-0",
};

/**
 * The floating label bubble on its own. Drop it directly inside a trigger that
 * already establishes a `group/tt relative` context — handy when wrapping the
 * trigger in an extra element would disturb layout (e.g. a `sm:hidden` button).
 */
export function TooltipBubble({ label, side = "top", className }) {
  return (
    <span
      role="tooltip"
      className={cn(
        // Show on hover, or on keyboard focus only (focus-visible). Using
        // focus-within here would keep the bubble stuck after a mouse click,
        // since the trigger retains DOM focus.
        "pointer-events-none absolute z-[300] whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium text-ink-contrast opacity-0 shadow-pop transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-visible/tt:opacity-100 group-has-[:focus-visible]/tt:opacity-100",
        POS[side],
        className
      )}
    >
      {label}
    </span>
  );
}

/**
 * CSS-only tooltip (shows on hover/focus-within). Wraps its child in a
 * positioned inline-flex span. Keep `label` short. For interactive triggers,
 * the child should be focusable for keyboard users.
 */
export default function Tooltip({ label, side = "top", children, className }) {
  if (!label) return children;
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <TooltipBubble label={label} side={side} className={className} />
    </span>
  );
}
