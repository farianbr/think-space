/** Compact relative time, e.g. "now", "5m", "3h", "2d", or a date. */
export function timeAgo(input) {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  const diff = Date.now() - date.getTime();
  const s = Math.round(diff / 1000);
  if (s < 45) return "now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d`;
  const w = Math.round(d / 7);
  if (w < 5) return `${w}w`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

/** Friendly absolute date, e.g. "Jun 15, 2026". */
export function formatDate(input) {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** First name / handle from a user object. */
export function displayName(user) {
  if (!user) return "there";
  return user.name || user.email?.split("@")[0] || "there";
}
