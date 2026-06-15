import { forwardRef } from "react";
import { cn } from "../../lib/cn";

const VARIANTS = {
  // Primary action — near-black "ink" (flips to near-white in dark mode)
  primary:
    "bg-ink text-ink-contrast hover:opacity-90 active:opacity-100 disabled:opacity-40 shadow-soft",
  // Quiet, bordered surface button
  secondary:
    "bg-surface text-ink border border-line hover:bg-sunken active:bg-sunken disabled:opacity-50",
  // Borderless
  ghost:
    "bg-transparent text-ink-soft hover:bg-sunken hover:text-ink active:bg-sunken disabled:opacity-50",
  // Restrained amber accent — used sparingly
  accent:
    "bg-accent text-accent-contrast hover:opacity-90 active:opacity-100 disabled:opacity-40 shadow-soft",
  // Destructive
  danger:
    "bg-danger text-white hover:opacity-90 active:opacity-100 disabled:opacity-40",
  // Subtle danger (text only)
  "danger-ghost":
    "bg-transparent text-danger hover:bg-danger-soft active:bg-danger-soft disabled:opacity-50",
};

const SIZES = {
  xs: "h-7 px-2.5 text-xs gap-1.5 rounded-md",
  sm: "h-8 px-3 text-sm gap-1.5 rounded-md",
  md: "h-10 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-[15px] gap-2 rounded-lg",
};

/**
 * Primary button primitive. Use `as` to render Link/anchor while keeping styles.
 */
const Button = forwardRef(function Button(
  {
    as: Comp = "button",
    variant = "primary",
    size = "md",
    loading = false,
    icon: Icon,
    iconRight: IconRight,
    className,
    children,
    disabled,
    type,
    ...props
  },
  ref
) {
  const isButton = Comp === "button";
  return (
    <Comp
      ref={ref}
      type={isButton ? type || "button" : undefined}
      disabled={isButton ? disabled || loading : undefined}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center whitespace-nowrap font-medium",
        "transition-[opacity,background-color,box-shadow,transform] duration-150 ease-out",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent",
        "active:scale-[0.985] disabled:pointer-events-none disabled:active:scale-100",
        VARIANTS[variant],
        SIZES[size],
        className
      )}
      {...props}
    >
      {loading ? (
        <span
          className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent opacity-70"
          aria-hidden
        />
      ) : (
        Icon && <Icon className="size-4 shrink-0" strokeWidth={2} aria-hidden />
      )}
      {children && <span className="truncate">{children}</span>}
      {!loading && IconRight && (
        <IconRight className="size-4 shrink-0" strokeWidth={2} aria-hidden />
      )}
    </Comp>
  );
});

export default Button;
