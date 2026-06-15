import { cn } from "../../lib/cn";

/**
 * Calm, illustration-free empty state. A single lucide `icon` sits in a soft
 * tinted medallion above a tight title/description and an optional action.
 */
export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  size = "md",
}) {
  const compact = size === "sm";
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "py-10" : "py-16 sm:py-20",
        className
      )}
    >
      {Icon && (
        <div
          className={cn(
            "mb-5 flex items-center justify-center rounded-2xl border border-hairline bg-surface text-faint shadow-soft",
            compact ? "size-12" : "size-14"
          )}
        >
          <Icon className={compact ? "size-5" : "size-6"} strokeWidth={1.75} aria-hidden />
        </div>
      )}
      <h3 className="text-[15px] font-semibold tracking-tight text-ink">
        {title}
      </h3>
      {description && (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-muted">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
