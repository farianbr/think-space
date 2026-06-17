import Tooltip from "./Tooltip";
import { cn } from "../../lib/cn";

// Deterministic warm palette so a given user keeps the same avatar color.
const PALETTE = [
  "bg-[#C2781D] text-white",
  "bg-[#3F7D56] text-white",
  "bg-[#3F6D7D] text-white",
  "bg-[#8a5a3c] text-white",
  "bg-[#6d5a8a] text-white",
  "bg-[#b4452f] text-white",
  "bg-[#5a6d3f] text-white",
];

function hashString(str = "") {
  let h = 0;
  for (let i = 0; i < str.length; i++) h = (h << 5) - h + str.charCodeAt(i);
  return Math.abs(h);
}

// eslint-disable-next-line react-refresh/only-export-components
export function initialsFor({ name, email } = {}) {
  const source = (name || email || "?").trim();
  if (!source) return "?";
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

const SIZES = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-xs",
  md: "size-9 text-[13px]",
  lg: "size-11 text-sm",
  xl: "size-16 text-lg",
};

export default function Avatar({
  user,
  name,
  email,
  src,
  size = "md",
  ring = false,
  className,
  title,
  tooltipSide = "bottom",
}) {
  const u = user || { name, email };
  const color = PALETTE[hashString(u.email || u.name || "") % PALETTE.length];
  const label = title ?? u.name ?? u.email;

  const avatar = (
    <span
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-semibold uppercase",
        ring && "ring-2 ring-surface",
        !src && color,
        SIZES[size],
        className
      )}
    >
      {src ? (
        <img src={src} alt={label || ""} className="size-full object-cover" />
      ) : (
        initialsFor(u)
      )}
    </span>
  );

  return label ? (
    <Tooltip label={label} side={tooltipSide} className="normal-case">
      {avatar}
    </Tooltip>
  ) : (
    avatar
  );
}

/** Overlapping avatar stack with a "+N" overflow chip. */
export function AvatarGroup({ users = [], max = 4, size = "sm", className }) {
  const shown = users.slice(0, max);
  const extra = users.length - shown.length;
  return (
    <div className={cn("flex items-center -space-x-2", className)}>
      {shown.map((u, i) => (
        <Avatar
          key={u.id || u.email || i}
          user={u}
          size={size}
          ring
          className="hover:z-10"
        />
      ))}
      {extra > 0 && (
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full bg-sunken text-[11px] font-semibold text-muted ring-2 ring-surface",
            SIZES[size]
          )}
        >
          +{extra}
        </span>
      )}
    </div>
  );
}
