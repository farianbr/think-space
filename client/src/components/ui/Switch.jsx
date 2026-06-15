import { cn } from "../../lib/cn";

/**
 * Accessible on/off switch. Amber accent in the "on" state reads clearly in
 * both light and dark themes (avoids the ink-on-ink blend in dark mode).
 */
export default function Switch({ checked = false, onChange, disabled, label, className }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange?.(!checked)}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-50",
        checked ? "bg-accent" : "bg-line",
        className
      )}
    >
      <span
        className={cn(
          "inline-block size-5 transform rounded-full bg-white shadow-soft transition-transform duration-150 ease-out",
          checked ? "translate-x-[22px]" : "translate-x-0.5"
        )}
      />
    </button>
  );
}
