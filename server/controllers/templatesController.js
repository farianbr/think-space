import { prisma } from "../prismaClient.js";
import { logActivity } from "../lib/activity.js";

/** GET /api/templates — public gallery of starter templates. */
export async function getTemplates(req, res) {
  try {
    const templates = await prisma.template.findMany({
      orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
    });
    return res.json({ templates });
  } catch (err) {
    console.error("getTemplates error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

const HEX_COLOR = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/**
 * POST /api/templates/:slug/use   body: { title? }
 * Clone a template's blueprint into a brand-new board owned by the user.
 */
export async function useTemplate(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const template = await prisma.template.findUnique({ where: { slug: req.params.slug } });
    if (!template) return res.status(404).json({ message: "Template not found" });

    const blueprint = template.blueprint || {};
    const title =
      (typeof req.body?.title === "string" && req.body.title.trim()) || template.title;

    const board = await prisma.board.create({
      data: {
        title: title.slice(0, 120),
        description: template.description?.slice(0, 500) || null,
        icon: blueprint.icon || template.thumbnail || null,
        color: HEX_COLOR.test(blueprint.color || "") ? blueprint.color : null,
        ownerId: userId,
        lastActivityAt: new Date(),
      },
    });

    const notes = Array.isArray(blueprint.notes) ? blueprint.notes : [];
    if (notes.length) {
      await prisma.note.createMany({
        data: notes.slice(0, 200).map((n) => ({
          boardId: board.id,
          text: typeof n.text === "string" ? n.text.slice(0, 5000) : "",
          x: Number.isFinite(n.x) ? Math.round(n.x) : 100,
          y: Number.isFinite(n.y) ? Math.round(n.y) : 100,
          width: Number.isFinite(n.width) ? Math.max(100, Math.round(n.width)) : 200,
          height: Number.isFinite(n.height) ? Math.max(60, Math.round(n.height)) : 140,
          color: HEX_COLOR.test(n.color || "") ? n.color : "#fde047",
        })),
      });
    }

    logActivity({
      boardId: board.id,
      actorId: userId,
      type: "board.created",
      meta: { title: board.title, template: template.slug },
    });

    return res.status(201).json({ board });
  } catch (err) {
    console.error("useTemplate error", err);
    return res.status(500).json({ message: "Server error" });
  }
}
