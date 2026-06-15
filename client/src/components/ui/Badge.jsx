import { cn } from "../../lib/cn";

const VARIANTS = {
  neutral: "bg-sunken text-muted",
  ink: "bg-ink text-ink-contrast",
  accent: "bg-accent-soft text-accent",
  positive: "bg-positive-soft text-positive",
  danger: "bg-danger-soft text-danger",
  outline: "border border-line text-muted",
};

export default function Badge({
  variant = "neutral",
  dot = false,
  className,
  children,
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        VARIANTS[variant],
        className
      )}
    >
      {dot && <span className="size-1.5 rounded-full bg-current opacity-80" />}
      {children}
    </span>
  );
}
