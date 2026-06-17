import {
  createContext,
  useContext,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  cloneElement,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "../../lib/cn";

// Lets items close the menu on select without relying on event bubbling
// (items call stopPropagation, so the menu's own onClick can't see the click).
const MenuContext = createContext(null);

/**
 * Lightweight popover menu anchored to its trigger. Closes on outside click,
 * Esc, or item selection. `trigger` is a single element that receives onClick.
 *
 * The menu is rendered in a portal with fixed positioning so it never gets
 * clipped by an ancestor's `overflow` (e.g. inside a modal or a scroll area)
 * and stays within the viewport.
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
  const [coords, setCoords] = useState(null);
  const anchorRef = useRef(null);
  const menuRef = useRef(null);

  const position = () => {
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor || !menu) return;
    const r = anchor.getBoundingClientRect();
    const mw = menu.offsetWidth;
    const mh = menu.offsetHeight;
    const margin = 8;
    const gap = 6;

    // Prefer below the trigger; flip above when there isn't room below.
    let top = r.bottom + gap;
    if (top + mh > window.innerHeight - margin && r.top - gap - mh > margin) {
      top = r.top - gap - mh;
    }
    top = Math.min(Math.max(margin, top), window.innerHeight - mh - margin);

    // Align the menu's edge to the trigger, then clamp to the viewport.
    let left = align === "end" ? r.right - mw : r.left;
    left = Math.min(Math.max(margin, left), window.innerWidth - mw - margin);

    setCoords({ top, left });
  };

  useLayoutEffect(() => {
    if (open) position();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e) => {
      if (anchorRef.current?.contains(e.target)) return;
      if (menuRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    const reflow = () => position();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", reflow);
    window.addEventListener("scroll", reflow, true);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", reflow);
      window.removeEventListener("scroll", reflow, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div ref={anchorRef} className="relative inline-flex">
      {triggerEl}
      {open &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            onClick={() => setOpen(false)}
            style={{
              top: coords?.top ?? 0,
              left: coords?.left ?? 0,
              visibility: coords ? "visible" : "hidden",
            }}
            className={cn(
              "fixed z-[200] overflow-hidden rounded-xl border border-hairline bg-elevated p-1 shadow-pop animate-pop-in",
              width,
              className
            )}
          >
            <MenuContext.Provider value={{ close: () => setOpen(false) }}>
              {children}
            </MenuContext.Provider>
          </div>,
          document.body
        )}
    </div>
  );
}

function Item({ icon: Icon, danger, disabled, onSelect, children, className }) {
  const menu = useContext(MenuContext);
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        onSelect?.(e);
        menu?.close?.();
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
