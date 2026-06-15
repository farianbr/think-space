import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "../../lib/cn";
import IconButton from "./IconButton";

const SIZES = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

/**
 * Accessible modal dialog: portal, scroll lock, Esc to close, backdrop click,
 * focus trap and focus restore. Header/footer are optional.
 */
export default function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  children,
  footer,
  closeOnBackdrop = true,
  hideClose = false,
  className,
}) {
  const panelRef = useRef(null);
  const restoreFocusRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = document.activeElement;

    const onKey = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose?.();
      }
      if (e.key === "Tab") trapFocus(e);
    };

    function trapFocus(e) {
      const panel = panelRef.current;
      if (!panel) return;
      const focusables = panel.querySelectorAll(
        'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Focus the first sensible target inside the panel.
    const t = setTimeout(() => {
      const panel = panelRef.current;
      const target =
        panel?.querySelector("[data-autofocus]") ||
        panel?.querySelector(
          'input, textarea, button:not([aria-label="Close"])'
        ) ||
        panel;
      target?.focus?.();
    }, 0);

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(t);
      restoreFocusRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div
        className="absolute inset-0 bg-ink/35 backdrop-blur-[2px] animate-fade-in"
        onClick={closeOnBackdrop ? onClose : undefined}
        aria-hidden
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={typeof title === "string" ? title : undefined}
        tabIndex={-1}
        className={cn(
          "relative w-full overflow-hidden rounded-2xl border border-hairline bg-elevated shadow-pop outline-none animate-pop-in",
          SIZES[size],
          className
        )}
      >
        {(title || !hideClose) && (
          <div className="flex items-start justify-between gap-4 px-6 pt-5">
            <div className="min-w-0">
              {title && (
                <h2 className="text-[17px] font-semibold tracking-tight text-ink">
                  {title}
                </h2>
              )}
              {description && (
                <p className="mt-1 text-sm text-muted">{description}</p>
              )}
            </div>
            {!hideClose && (
              <IconButton
                icon={X}
                label="Close"
                size="sm"
                onClick={onClose}
                className="-mr-2 -mt-1"
              />
            )}
          </div>
        )}

        {children != null && children !== false && (
          <div className="px-6 py-5">{children}</div>
        )}

        {footer && (
          <div className="flex items-center justify-end gap-2 border-t border-hairline bg-surface px-6 py-4">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
