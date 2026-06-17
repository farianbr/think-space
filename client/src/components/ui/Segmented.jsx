import Tooltip from "./Tooltip";
import { cn } from "../../lib/cn";

/**
 * Compact segmented control. `options` = [{ value, label?, icon?, title? }].
 * Used for grid/list toggles and small filter switches.
 */
export default function Segmented({ value, onChange, options, className, size = "md" }) {
  const pad = size === "sm" ? "h-8" : "h-9";
  return (
    <div
      role="tablist"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-lg border border-hairline bg-sunken p-0.5",
        className
      )}
    >
      {options.map((opt) => {
        const active = opt.value === value;
        const Icon = opt.icon;
        // Tooltip when there's an explicit title, or for icon-only segments
        // (a visible label needs no hover hint).
        const tip = opt.title || opt.label;
        const showTip = Boolean(opt.title || !opt.label);
        const button = (
          <button
            role="tab"
            aria-selected={active}
            aria-label={tip}
            onClick={() => onChange(opt.value)}
            className={cn(
              "inline-flex items-center justify-center gap-1.5 rounded-[7px] px-2.5 text-sm font-medium transition-colors duration-150",
              pad,
              active
                ? "bg-surface text-ink shadow-soft"
                : "text-muted hover:text-ink"
            )}
          >
            {Icon && <Icon className="size-4" strokeWidth={2} aria-hidden />}
            {opt.label && <span>{opt.label}</span>}
          </button>
        );
        return showTip && tip ? (
          <Tooltip key={opt.value} label={tip} side="bottom">
            {button}
          </Tooltip>
        ) : (
          <span key={opt.value} className="inline-flex">
            {button}
          </span>
        );
      })}
    </div>
  );
}
