import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  getBoardActivity,
  getWorkspaceActivity,
} from "../controllers/activityController.js";

const router = Router();

// Workspace-wide feed
router.get("/activity", requireAuth, getWorkspaceActivity);

// Per-board feed
router.get("/boards/:boardId/activity", requireAuth, getBoardActivity);

export default router;
