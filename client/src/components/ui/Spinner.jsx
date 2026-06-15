import { cn } from "../../lib/cn";

const SIZES = { sm: "size-4 border-2", md: "size-6 border-2", lg: "size-8 border-[3px]" };

export default function Spinner({ size = "md", className, label }) {
  return (
    <span
      role="status"
      aria-label={label || "Loading"}
      className={cn(
        "inline-block animate-spin rounded-full border-current border-t-transparent text-muted",
        SIZES[size],
        className
      )}
    />
  );
}
