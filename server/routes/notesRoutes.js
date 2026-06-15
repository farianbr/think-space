import { Router } from "express";
import { getNotesSnapshot } from "../controllers/notesController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { userCanAccessBoard } from "../lib/boardAccess.js";

const router = Router();

// GET /api/boards/:boardId/notes  -> returns all notes for a board
router.get("/boards/:boardId/notes", requireAuth, async (req, res) => {
  try {
    const { boardId } = req.params;

    const allowed = await userCanAccessBoard(boardId, req.user.id);
    if (!allowed) return res.status(403).json({ error: "Forbidden" });

    const notes = await getNotesSnapshot(boardId);
    res.json({ boardId, notes });
  } catch (err) {
    console.error("getNotes error", err);
    res.status(500).json({ error: "Server error" });
  }
});

export default router;
