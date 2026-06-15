import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getPeople } from "../controllers/peopleController.js";

const router = Router();

// Collaborators across all of the current user's boards.
router.get("/people", requireAuth, getPeople);

export default router;
