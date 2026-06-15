import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import {
  getBillingStatus,
  createCheckoutSession,
  createPortalSession,
} from "../controllers/billingController.js";

const router = Router();

// Authenticated billing actions. The webhook route is mounted separately in
// server.js because it needs a raw (unparsed) body for signature verification.
router.get("/", requireAuth, getBillingStatus);
router.post("/checkout", requireAuth, createCheckoutSession);
router.post("/portal", requireAuth, createPortalSession);

export default router;
