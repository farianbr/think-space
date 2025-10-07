import { Router } from "express";
import { getNotesSnapshot } from "../controllers/notesController.js";

const router = Router();

// GET /api/boards/:boardId/notes  -> returns all notes for a board
router.get("/boards/:boardId/notes", async (req, res) => {
  const { boardId } = req.params;
  const notes = await getNotesSnapshot(boardId);
  res.json({ boardId, notes });
});

export default router;
