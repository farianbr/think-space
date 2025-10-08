import { Router } from "express";
import { register, login } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();

router.post("/register", register);
router.post("/login", login);

router.get("/me", requireAuth, (req, res) => {
  res.json({ userId: req.user.id });
});

export default router;
