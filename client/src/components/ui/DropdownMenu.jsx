import { useEffect, useRef, useState, cloneElement } from "react";
import { cn } from "../../lib/cn";

/**
 * Lightweight popover menu anchored to its trigger. Closes on outside click,
 * Esc, or item selection. `trigger` is a single element that receives onClick.
 *
 *   <DropdownMenu trigger={<IconButton .../>} align="end">
 *     <DropdownMenu.Item icon={Pencil} onSelect={...}>Rename</DropdownMenu.Item>
 *     <DropdownMenu.Separator />
 *     <DropdownMenu.Item danger icon={Trash} onSelect={...}>Delete</DropdownMenu.Item>
 *   </DropdownMenu>
 */
export default function DropdownMenu({
  trigger,
  children,
  align = "end",
  width = "min-w-44",
  className,
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const triggerEl = cloneElement(trigger, {
    onClick: (e) => {
      e.stopPropagation();
      trigger.props.onClick?.(e);
      setOpen((o) => !o);
    },
    "aria-haspopup": "menu",
    "aria-expanded": open,
  });

  return (
    <div ref={rootRef} className="relative inline-flex">
      {triggerEl}
      {open && (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute top-[calc(100%+6px)] z-50 overflow-hidden rounded-xl border border-hairline bg-elevated p-1 shadow-pop animate-pop-in",
            align === "end" ? "right-0" : "left-0",
            width,
            className
          )}
        >
          {children}
        </div>
      )}
    </div>
  );
}

function Item({ icon: Icon, danger, disabled, onSelect, children, className }) {
  return (
    <button
      role="menuitem"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(e);
      }}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-40",
        danger
          ? "text-danger hover:bg-danger-soft"
          : "text-ink-soft hover:bg-sunken hover:text-ink",
        className
      )}
    >
      {Icon && <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />}
      <span className="truncate">{children}</span>
    </button>
  );
}

function Separator() {
  return <div className="my-1 h-px bg-hairline" role="separator" />;
}

function Label({ children }) {
  return (
    <div className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-faint">
      {children}
    </div>
  );
}

DropdownMenu.Item = Item;
DropdownMenu.Separator = Separator;
DropdownMenu.Label = Label;
