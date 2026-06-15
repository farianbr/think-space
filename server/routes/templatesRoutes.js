import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { getTemplates, useTemplate } from "../controllers/templatesController.js";

const router = Router();

router.get("/", requireAuth, getTemplates);
router.post("/:slug/use", requireAuth, useTemplate);

export default router;
