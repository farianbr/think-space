import { Crown, Shield, Pencil, MessageSquare, Eye } from "./icons";

/**
 * Collaborator roles, ordered most → least privileged. "owner" is implicit
 * (board.ownerId) and shown but never assignable. "member" is a legacy alias.
 */
export const ROLES = [
  { value: "owner", label: "Owner", description: "Full control, including deletion", icon: Crown, assignable: false },
  { value: "admin", label: "Admin", description: "Manage members and board settings", icon: Shield, assignable: true },
  { value: "editor", label: "Editor", description: "Create and edit content", icon: Pencil, assignable: true },
  { value: "commenter", label: "Commenter", description: "Comment and react only", icon: MessageSquare, assignable: true },
  { value: "viewer", label: "Viewer", description: "View only", icon: Eye, assignable: true },
];

const BY_VALUE = Object.fromEntries(ROLES.map((r) => [r.value, r]));

export function roleMeta(value) {
  if (value === "member") return BY_VALUE.editor; // legacy alias
  return BY_VALUE[value] || BY_VALUE.editor;
}

export const ASSIGNABLE_ROLES = ROLES.filter((r) => r.assignable);

// Capability checks — mirror server/lib/permissions.js. Keep the two in sync.
const RANK = { owner: 5, admin: 4, editor: 3, member: 3, commenter: 2, viewer: 1 };
const rank = (role) => RANK[role] || 0;

/** Editor and above may create/edit/delete notes. */
export const canEditRole = (role) => rank(role) >= RANK.editor;
/** Commenter and above may comment and react. */
export const canCommentRole = (role) => rank(role) >= RANK.commenter;
/** Admin and owner may manage members and board settings. */
export const canManageMembersRole = (role) => rank(role) >= RANK.admin;
