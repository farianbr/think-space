import { Router } from "express";
import {
  createBoard,
  deleteBoard,
  getMyBoards,
  getBoardById,
  updateBoard,
  starBoard,
  unstarBoard,
} from "../controllers/boardsController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/my", requireAuth, getMyBoards);

router.get("/:boardId", requireAuth, getBoardById);

router.post("/", requireAuth, createBoard);

router.patch("/:boardId", requireAuth, updateBoard);

router.delete("/:boardId", requireAuth, deleteBoard);

router.post("/:boardId/star", requireAuth, starBoard);
router.delete("/:boardId/star", requireAuth, unstarBoard);

export default router;
