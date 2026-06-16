import {
  Plus,
  Pencil,
  Archive,
  ArchiveRestore,
  StickyNote,
  Trash2,
  UserPlus,
  UserCog,
  Bell,
} from "./icons";

/** Map an activity row to an icon + human phrase. */
export function describeActivity(activity) {
  const actor = activity?.actor?.name || activity?.actor?.email?.split("@")[0] || "Someone";
  const m = activity?.meta || {};
  switch (activity?.type) {
    case "board.created":
      return { icon: Plus, text: `${actor} created ${m.template ? "a board from a template" : "this board"}` };
    case "board.renamed":
      return { icon: Pencil, text: `${actor} renamed the board to â€œ${m.to}â€` };
    case "board.archived":
      return { icon: Archive, text: `${actor} archived the board` };
    case "board.restored":
      return { icon: ArchiveRestore, text: `${actor} restored the board` };
    case "note.created":
      return { icon: StickyNote, text: `${actor} added a note` };
    case "note.deleted":
      return { icon: Trash2, text: `${actor} deleted a note` };
    case "member.added":
      return { icon: UserPlus, text: `${actor} added a collaborator` };
    case "member.role_changed":
      return { icon: UserCog, text: `${actor} changed a collaboratorâ€™s role` };
    default:
      return { icon: Bell, text: `${actor} updated the board` };
  }
}

/** Map a notification row to an icon + title/body. */
export function describeNotification(n) {
  const data = n?.data || {};
  switch (n?.type) {
    case "invite":
      return {
        icon: UserPlus,
        title: "Board invitation",
        body: `You were added to â€œ${data.boardTitle || "a board"}â€${data.role ? ` as ${data.role}` : ""}.`,
      };
    case "member_added":
      return {
        icon: UserPlus,
        title: "New collaborator",
        body: `${data.memberName || "Someone"} joined â€œ${data.boardTitle || "a board"}â€.`,
      };
    case "mention":
      return {
        icon: Bell,
        title: "You were mentioned",
        body: data.preview
          ? `â€œ${data.preview}â€`
          : `You were mentioned in â€œ${data.boardTitle || "a board"}â€.`,
      };
    default:
      return { icon: Bell, title: "Update", body: data.message || "You have a new update." };
  }
}
