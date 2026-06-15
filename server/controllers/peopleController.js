import { prisma } from "../prismaClient.js";

// Role privilege order, most → least. Used to pick a person's "top" role
// across the boards they share with the requesting user.
const ROLE_RANK = { owner: 0, admin: 1, editor: 2, member: 2, commenter: 3, viewer: 4 };
const rank = (role) => (role in ROLE_RANK ? ROLE_RANK[role] : ROLE_RANK.editor);

const userSelect = { id: true, name: true, email: true, avatarUrl: true };

/**
 * GET /api/people
 * Everyone the current user collaborates with, aggregated across every board
 * they own or belong to. Powers the Team page. Returns, per person:
 *   { id, name, email, avatarUrl, sharedCount, topRole, lastActiveAt,
 *     sharedBoards: [{ id, title, color, role }] }
 */
export async function getPeople(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const boards = await prisma.board.findMany({
      where: { OR: [{ ownerId: userId }, { members: { some: { userId } } }] },
      select: {
        id: true,
        title: true,
        color: true,
        ownerId: true,
        lastActivityAt: true,
        owner: { select: userSelect },
        members: { select: { role: true, user: { select: userSelect } } },
      },
    });

    const people = new Map();

    const add = (user, board, role) => {
      if (!user || user.id === userId) return; // skip self
      let p = people.get(user.id);
      if (!p) {
        p = { ...user, sharedBoards: [], topRole: role, lastActiveAt: null };
        people.set(user.id, p);
      }
      p.sharedBoards.push({ id: board.id, title: board.title, color: board.color, role });
      if (rank(role) < rank(p.topRole)) p.topRole = role;
      const t = board.lastActivityAt ? new Date(board.lastActivityAt).getTime() : 0;
      if (t && (!p.lastActiveAt || t > new Date(p.lastActiveAt).getTime())) {
        p.lastActiveAt = board.lastActivityAt;
      }
    };

    for (const b of boards) {
      add(b.owner, b, "owner");
      for (const m of b.members) add(m.user, b, m.role);
    }

    const list = [...people.values()]
      .map((p) => ({ ...p, sharedCount: p.sharedBoards.length }))
      .sort(
        (a, b) =>
          b.sharedCount - a.sharedCount ||
          (a.name || a.email).localeCompare(b.name || b.email)
      );

    return res.json({ people: list });
  } catch (err) {
    console.error("getPeople error", err);
    return res.status(500).json({ message: "Server error" });
  }
}
