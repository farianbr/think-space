import { forwardRef } from "react";
import { cn } from "../../lib/cn";

const base =
  "w-full rounded-lg border border-line bg-surface text-ink placeholder:text-faint " +
  "transition-[border-color,box-shadow] duration-150 ease-out " +
  "focus:border-ink/30 focus:outline-none focus:ring-4 focus:ring-ink/5 " +
  "disabled:cursor-not-allowed disabled:opacity-60";

/**
 * Text input. Pass `icon` for a leading icon and `invalid` for error styling.
 * 16px font-size avoids iOS zoom on focus.
 */
export const Input = forwardRef(function Input(
  { icon: Icon, invalid, className, style, ...props },
  ref
) {
  return (
    <div className="relative">
      {Icon && (
        <Icon
          className="pointer-events-none absolute left-3 top-1/2 size-[18px] -translate-y-1/2 text-faint"
          strokeWidth={2}
          aria-hidden
        />
      )}
      <input
        ref={ref}
        aria-invalid={invalid || undefined}
        className={cn(
          base,
          "h-10 px-3.5 text-[15px]",
          Icon && "pl-10",
          invalid && "border-danger/60 focus:border-danger/60 focus:ring-danger/10",
          className
        )}
        style={{ fontSize: "16px", ...style }}
        {...props}
      />
    </div>
  );
});

export const Textarea = forwardRef(function Textarea(
  { invalid, className, style, ...props },
  ref
) {
  return (
    <textarea
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(
        base,
        "min-h-24 px-3.5 py-2.5 text-[15px] leading-relaxed",
        invalid && "border-danger/60 focus:border-danger/60 focus:ring-danger/10",
        className
      )}
      style={{ fontSize: "16px", ...style }}
      {...props}
    />
  );
});

export default Input;
