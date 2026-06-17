/**
 * Think Space brand mark — two overlapping rounded squares.
 *
 * The solid square and the small square's border use `currentColor`; the small
 * square's interior ("notch") uses `notch` so it reads as a cut-out against
 * whatever sits behind the logo. It defaults to the ink chip the mark normally
 * lives in (`bg-ink`); pass a different color when placing it on another
 * surface (e.g. `notch="var(--color-canvas)"`).
 */
export default function Logo({ className, notch = "var(--color-ink)" }) {
  return (
    <svg viewBox="0 0 32 32" fill="none" className={className} aria-hidden>
      <rect x="6.5" y="9" width="14.5" height="14.5" rx="3.6" fill="currentColor" />
      <rect
        x="16"
        y="5"
        width="11"
        height="11"
        rx="3"
        fill={notch}
        stroke="currentColor"
        strokeWidth="2.4"
      />
    </svg>
  );
}
