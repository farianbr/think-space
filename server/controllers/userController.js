import bcrypt from "bcrypt";
import { prisma } from "../prismaClient.js";
import { updateProfileSchema, changePasswordSchema } from "../validation/schemas.js";

const publicSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  preferences: true,
  twoFactorEnabled: true,
  createdAt: true,
};

/**
 * PATCH /api/auth/me  — update the current user's profile / preferences.
 */
export async function updateProfile(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const parsed = updateProfileSchema.safeParse(req.body);
    if (!parsed.success)
      return res.status(400).json({ message: parsed.error.issues?.[0]?.message || "Invalid payload" });

    const user = await prisma.user.update({
      where: { id: userId },
      data: parsed.data,
      select: publicSelect,
    });
    return res.json({ user });
  } catch (err) {
    console.error("updateProfile error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/auth/change-password  — verify the current password, set a new one.
 */
export async function changePassword(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success)
      return res
        .status(400)
        .json({ message: parsed.error.issues?.[0]?.message || "Invalid payload" });

    const { currentPassword, newPassword } = parsed.data;
    if (currentPassword === newPassword)
      return res.status(400).json({ message: "New password must be different" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true },
    });
    if (!user) return res.status(404).json({ message: "User not found" });

    const ok = await bcrypt.compare(currentPassword, user.password);
    if (!ok) return res.status(400).json({ message: "Current password is incorrect" });

    const hash = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({ where: { id: userId }, data: { password: hash } });

    return res.json({ ok: true });
  } catch (err) {
    console.error("changePassword error", err);
    return res.status(500).json({ message: "Server error" });
  }
}
