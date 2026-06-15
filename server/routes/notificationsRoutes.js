import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  getNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} from "../controllers/notificationsController.js";

const router = Router();

router.get("/", requireAuth, getNotifications);
router.patch("/read-all", requireAuth, markAllNotificationsRead);
router.patch("/:id/read", requireAuth, markNotificationRead);

export default router;
