import { cn } from "../../lib/cn";

const POS = {
  top: "bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2",
  bottom: "top-[calc(100%+6px)] left-1/2 -translate-x-1/2",
  left: "right-[calc(100%+6px)] top-1/2 -translate-y-1/2",
  right: "left-[calc(100%+6px)] top-1/2 -translate-y-1/2",
};

/**
 * CSS-only tooltip (shows on hover/focus-within). Keep `label` short.
 * For interactive triggers, the child should be focusable for keyboard users.
 */
export default function Tooltip({ label, side = "top", children, className }) {
  if (!label) return children;
  return (
    <span className="group/tt relative inline-flex">
      {children}
      <span
        role="tooltip"
        className={cn(
          "pointer-events-none absolute z-[60] whitespace-nowrap rounded-md bg-ink px-2 py-1 text-xs font-medium text-ink-contrast opacity-0 shadow-pop transition-opacity duration-150 group-hover/tt:opacity-100 group-focus-within/tt:opacity-100",
          POS[side],
          className
        )}
      >
        {label}
      </span>
    </span>
  );
}
