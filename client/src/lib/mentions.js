// Helpers for the @mention autocomplete in note editing.
//
// `handle` is the token inserted into the note text (e.g. "@ada"). It must
// match a server-side alias (server/lib/mentions.js) so the mention
// notification actually fires — we use the first name, falling back to the
// email local-part. Keep this in sync with the server's aliasesFor().

export function mentionCandidates(members = [], excludeUserId) {
  const seen = new Set();
  const out = [];
  for (const m of members) {
    const u = m.user || m;
    if (!u?.id || u.id === excludeUserId || seen.has(u.id)) continue;
    seen.add(u.id);
    const first = (u.name || "").trim().split(/\s+/)[0]?.toLowerCase();
    const handle = first || (u.email ? u.email.split("@")[0].toLowerCase() : "");
    if (!handle) continue;
    out.push({ id: u.id, name: u.name || u.email, email: u.email, handle });
  }
  return out;
}

export function filterMentionCandidates(candidates, query) {
  const q = (query || "").toLowerCase();
  return candidates
    .filter(
      (c) =>
        !q ||
        c.handle.startsWith(q) ||
        (c.name || "").toLowerCase().includes(q) ||
        (c.email || "").toLowerCase().includes(q)
    )
    .slice(0, 6);
}
