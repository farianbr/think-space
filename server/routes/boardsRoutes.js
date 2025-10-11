import { Router } from "express";
import { createBoard, deleteBoard, getMyBoards, getBoardById } from "../controllers/boardsController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

router.get("/my", requireAuth, getMyBoards);

router.get("/:boardId", requireAuth, getBoardById);

router.post("/", requireAuth, createBoard)

router.delete("/:boardId", requireAuth, deleteBoard)

export default router;
