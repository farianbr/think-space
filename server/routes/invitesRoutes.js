import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getInvitePreview, acceptInvite } from "../controllers/invitesController.js";

const router = Router();

// Public preview so the accept page can render before sign-in.
router.get("/:token", getInvitePreview);
// Accepting binds the invite to the signed-in account (email must match).
router.post("/:token/accept", requireAuth, acceptInvite);

export default router;
