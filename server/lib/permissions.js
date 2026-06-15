/**
 * Centralized role model and capability checks, shared across REST controllers
 * and socket handlers so authorization is defined in exactly one place.
 *
 * Roles, most → least privileged:
 *   owner      implicit (Board.ownerId), full control incl. deletion
 *   admin      manage members & board settings, edit content
 *   editor     create / edit / delete notes (and "member", a legacy alias)
 *   commenter  view + comment + react, but cannot edit notes
 *   viewer     view only
 */
export const ROLE_RANK = {
  owner: 5,
  admin: 4,
  editor: 3,
  member: 3, // legacy alias for editor
  commenter: 2,
  viewer: 1,
};

/** Normalize the legacy "member" alias to "editor" for display/storage parity. */
export function normalizeRole(role) {
  return role === "member" ? "editor" : role;
}

const rank = (role) => ROLE_RANK[role] || 0;

/** Anyone with a role can view the board. */
export function canView(role) {
  return rank(role) >= ROLE_RANK.viewer;
}

/** Commenter and above may post comments / reactions. */
export function canComment(role) {
  return rank(role) >= ROLE_RANK.commenter;
}

/** Editor and above may create, update, move, resize, or delete notes. */
export function canEdit(role) {
  return rank(role) >= ROLE_RANK.editor;
}

/** Admin and owner may add/remove members and change roles & board settings. */
export function canManageMembers(role) {
  return rank(role) >= ROLE_RANK.admin;
}

/** True when actor outranks target (used to prevent privilege escalation). */
export function outranks(actorRole, targetRole) {
  return rank(actorRole) > rank(targetRole);
}
