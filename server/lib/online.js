const online = new Map();

export function addOnline(boardId, user) {
  // user: { id, name, email }
  if (!boardId || !user || !user.id) return;
  if (!online.has(boardId)) online.set(boardId, new Map());
  online.get(boardId).set(user.id, { id: user.id, name: user.name ?? null, email: user.email ?? null });
}

export function removeOnline(boardId, userId) {
  if (!online.has(boardId)) return;
  const set = online.get(boardId);
  set.delete(userId);
  if (set.size === 0) online.delete(boardId);
}

export function getOnline(boardId) {
  const set = online.get(boardId);
  if (!set) return [];
  return Array.from(set.values()); // return user objects
}
