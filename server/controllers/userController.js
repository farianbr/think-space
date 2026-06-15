import { prisma } from "../prismaClient.js";
import { updateProfileSchema } from "../validation/schemas.js";

const publicSelect = {
  id: true,
  email: true,
  name: true,
  avatarUrl: true,
  preferences: true,
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
