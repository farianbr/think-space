import { Router } from "express";
import { register, login, getMe } from "../controllers/authController.js";
import { requireAuth } from "../middleware/requireAuth.js";
import { prisma } from "../prismaClient.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", requireAuth, getMe);

router.post("/logout", requireAuth, (req, res) => {
  // With JWT tokens, logout is handled client-side by removing the token
  // This endpoint exists for consistency but doesn't need to do much
  res.json({ message: "Logged out successfully" });
});

export default router;
