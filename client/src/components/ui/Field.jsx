import { useId } from "react";
import { cn } from "../../lib/cn";

/**
 * Labelled form field wrapper. Clones nothing — pass the control as children and
 * wire `id`/`aria-describedby` via the render prop for full a11y, or just use the
 * simple form where the label sits above the control.
 */
export default function Field({
  label,
  hint,
  error,
  required,
  className,
  children,
}) {
  const id = useId();
  const describedBy = error ? `${id}-error` : hint ? `${id}-hint` : undefined;

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      {label && (
        <label htmlFor={id} className="text-sm font-medium text-ink-soft">
          {label}
          {required && <span className="ml-0.5 text-danger">*</span>}
        </label>
      )}
      {typeof children === "function"
        ? children({ id, "aria-describedby": describedBy })
        : children}
      {error ? (
        <p id={`${id}-error`} className="text-xs text-danger">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
