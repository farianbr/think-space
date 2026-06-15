/**
 * Minimal classNames joiner. Accepts strings, arrays, and falsy values.
 * Kept dependency-free (no clsx/tailwind-merge); callers control conflicts.
 */
export function cn(...args) {
  return args
    .flat(Infinity)
    .filter(Boolean)
    .join(" ")
    .trim();
}
