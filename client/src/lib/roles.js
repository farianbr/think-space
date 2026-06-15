import { Crown, Shield, Pencil, MessageSquare, Eye } from "lucide-react";

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
