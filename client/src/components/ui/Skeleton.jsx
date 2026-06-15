import { cn } from "../../lib/cn";

/** Shimmering placeholder block (see .ts-skeleton in index.css). */
export default function Skeleton({ className, rounded = "rounded-lg", style }) {
  return <div className={cn("ts-skeleton", rounded, className)} style={style} />;
}
