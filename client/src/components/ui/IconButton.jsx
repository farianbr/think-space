import { forwardRef } from "react";
import { cn } from "../../lib/cn";
import { TooltipBubble } from "./Tooltip";

const VARIANTS = {
  ghost:
    "text-muted hover:bg-sunken hover:text-ink active:bg-sunken disabled:opacity-40",
  surface:
    "bg-surface text-ink-soft border border-line hover:bg-sunken hover:text-ink disabled:opacity-50 shadow-soft",
  ink: "bg-ink text-ink-contrast hover:opacity-90 disabled:opacity-40 shadow-soft",
};

const SIZES = {
  sm: "size-8 rounded-md [&_svg]:size-4",
  md: "size-9 rounded-lg [&_svg]:size-[18px]",
  lg: "size-10 rounded-lg [&_svg]:size-5",
};

/**
 * Square icon-only button. Always pass an accessible `label` — it doubles as
 * the styled hover tooltip (set `tooltip={false}` to opt out, or `tooltipSide`
 * to reposition).
 */
const IconButton = forwardRef(function IconButton(
  {
    icon: Icon,
    label,
    variant = "ghost",
    size = "md",
    tooltip = true,
    tooltipSide = "bottom",
    className,
    ...props
  },
  ref
) {
  const showTip = Boolean(label && tooltip);
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      className={cn(
        "inline-flex items-center justify-center transition-colors duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "active:scale-95 disabled:pointer-events-none",
        // Tooltip lives inside the button so responsive/layout classes on the
        // button (e.g. `sm:hidden`) keep working without an extra wrapper box.
        showTip && "group/tt relative",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {Icon && <Icon strokeWidth={2} aria-hidden />}
      {showTip && <TooltipBubble label={label} side={tooltipSide} />}
    </button>
  );
});

export default IconButton;
