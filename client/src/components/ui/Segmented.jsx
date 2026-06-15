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
        return (
          <button
            key={opt.value}
            role="tab"
            aria-selected={active}
            title={opt.title || opt.label}
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
      })}
    </div>
  );
}
