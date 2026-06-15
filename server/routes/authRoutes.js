import { Router } from "express";
import rateLimit from "express-rate-limit";
import { register, login, getMe } from "../controllers/authController.js";
import { updateProfile } from "../controllers/userController.js";
import { requireAuth } from "../middleware/requireAuth.js";

const router = Router();

// Throttle credential endpoints to slow brute-force / credential stuffing.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // per IP per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts, please try again later." },
});

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

router.get("/me", requireAuth, getMe);
router.patch("/me", requireAuth, updateProfile);

router.post("/logout", requireAuth, (req, res) => {
  // With JWT tokens, logout is handled client-side by removing the token
  // This endpoint exists for consistency but doesn't need to do much
  res.json({ message: "Logged out successfully" });
});

export default router;
