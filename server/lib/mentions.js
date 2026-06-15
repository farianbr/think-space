import { prisma } from "../prismaClient.js";
import { notify } from "./notify.js";

// Matches @handle tokens: letters, digits, dot, underscore, hyphen.
const MENTION_RE = /@([a-zA-Z0-9._-]+)/g;

/** Lowercased @handle tokens present in a block of text. */
function extractTokens(text) {
  if (typeof text !== "string" || !text.includes("@")) return new Set();
  const out = new Set();
  let m;
  MENTION_RE.lastIndex = 0;
  while ((m = MENTION_RE.exec(text)) !== null) out.add(m[1].toLowerCase());
  return out;
}

/** Aliases a member can be addressed by: email local-part, full name, first name. */
function aliasesFor(user) {
  const aliases = new Set();
  if (user.email) aliases.add(user.email.split("@")[0].toLowerCase());
  if (user.name) {
    const name = user.name.trim().toLowerCase();
    aliases.add(name.replace(/\s+/g, "")); // "Ada Lovelace" -> "adalovelace"
    aliases.add(name.split(/\s+/)[0]); // first name
  }
  return aliases;
}

/**
 * Create "mention" notifications for board members newly @mentioned in a note.
 * Only fires for handles present in `note.text` but not in `previousText`, so
 * repeated edits/moves don't re-notify. Best-effort; never throws.
 *
 * @param {{ boardId: string, note: { id: string, text: string }, actorId?: string, previousText?: string }} args
 */
export async function notifyMentions({ boardId, note, actorId, previousText = "" }) {
  try {
    const currentTokens = extractTokens(note?.text);
    if (currentTokens.size === 0) return;

    const priorTokens = extractTokens(previousText);
    // Only handles that are new in this edit.
    const newTokens = [...currentTokens].filter((t) => !priorTokens.has(t));
    if (newTokens.length === 0) return;
    const newTokenSet = new Set(newTokens);

    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: {
        title: true,
        owner: { select: { id: true, name: true, email: true } },
        members: { select: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!board) return;

    const people = [board.owner, ...board.members.map((m) => m.user)].filter(Boolean);

    const preview = (note.text || "").slice(0, 140);
    const notified = new Set();

    for (const person of people) {
      if (!person || person.id === actorId || notified.has(person.id)) continue;
      const aliases = aliasesFor(person);
      const isMentioned = [...aliases].some((a) => newTokenSet.has(a));
      if (!isMentioned) continue;

      notified.add(person.id);
      await notify({
        userId: person.id,
        type: "mention",
        boardId,
        actorId,
        data: { boardTitle: board.title, noteId: note.id, preview },
      });
    }
  } catch (err) {
    console.error("notifyMentions error", err?.message || err);
  }
}
