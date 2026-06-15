import otplib from "otplib";
import QRCode from "qrcode";

const { authenticator } = otplib;
import bcrypt from "bcrypt";
import { prisma } from "../prismaClient.js";
import {
  enableTwoFactorSchema,
  disableTwoFactorSchema,
  regenerateRecoveryCodesSchema,
} from "../validation/schemas.js";
import { generateRecoveryCodes, hashRecoveryCodes } from "../lib/recoveryCodes.js";

const ISSUER = "Think Space";

/**
 * POST /api/auth/2fa/setup
 * Generate a fresh TOTP secret, persist it (still disabled), and return the
 * otpauth URI + a QR data URL for the user to scan. Re-running before enabling
 * rotates the secret.
 */
export async function setupTwoFactor(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, twoFactorEnabled: true },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.twoFactorEnabled)
      return res.status(400).json({ message: "Two-factor is already enabled" });

    const secret = authenticator.generateSecret();
    const otpauthUrl = authenticator.keyuri(user.email, ISSUER, secret);
    const qrDataUrl = await QRCode.toDataURL(otpauthUrl);

    await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });

    return res.json({ otpauthUrl, qrDataUrl, secret });
  } catch (err) {
    console.error("setupTwoFactor error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/auth/2fa/enable  body: { code }
 * Verify a code against the pending secret and flip two-factor on.
 */
export async function enableTwoFactor(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const parsed = enableTwoFactorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Enter the 6-digit code" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorSecret: true, twoFactorEnabled: true },
    });
    if (!user?.twoFactorSecret)
      return res.status(400).json({ message: "Start setup before enabling" });
    if (user.twoFactorEnabled)
      return res.status(400).json({ message: "Two-factor is already enabled" });

    const valid = authenticator.verify({ token: parsed.data.code, secret: user.twoFactorSecret });
    if (!valid) return res.status(400).json({ message: "That code isn't valid. Try again." });

    // Issue a fresh set of single-use recovery codes. The plaintext is returned
    // exactly once here; only bcrypt hashes are persisted.
    const recoveryCodes = generateRecoveryCodes();
    const hashed = await hashRecoveryCodes(recoveryCodes);

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorRecoveryCodes: hashed },
    });
    return res.json({
      ok: true,
      twoFactorEnabled: true,
      recoveryCodes,
      recoveryCodesRemaining: recoveryCodes.length,
    });
  } catch (err) {
    console.error("enableTwoFactor error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/auth/2fa/recovery-codes  body: { password }
 * Replace the recovery codes with a fresh set (invalidating the old ones).
 * Requires the account password.
 */
export async function regenerateRecoveryCodes(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const parsed = regenerateRecoveryCodesSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Password required" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, twoFactorEnabled: true },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.twoFactorEnabled)
      return res.status(400).json({ message: "Enable two-factor first" });

    const ok = await bcrypt.compare(parsed.data.password, user.password);
    if (!ok) return res.status(400).json({ message: "Incorrect password" });

    const recoveryCodes = generateRecoveryCodes();
    const hashed = await hashRecoveryCodes(recoveryCodes);

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorRecoveryCodes: hashed },
    });
    return res.json({ ok: true, recoveryCodes, recoveryCodesRemaining: recoveryCodes.length });
  } catch (err) {
    console.error("regenerateRecoveryCodes error", err);
    return res.status(500).json({ message: "Server error" });
  }
}

/**
 * POST /api/auth/2fa/disable  body: { password }
 * Require the account password to turn two-factor off and clear the secret.
 */
export async function disableTwoFactor(req, res) {
  try {
    const userId = req.user?.id;
    if (!userId) return res.status(401).json({ message: "Unauthorized" });

    const parsed = disableTwoFactorSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: "Password required" });

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, password: true, twoFactorEnabled: true },
    });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.twoFactorEnabled)
      return res.status(400).json({ message: "Two-factor isn't enabled" });

    const ok = await bcrypt.compare(parsed.data.password, user.password);
    if (!ok) return res.status(400).json({ message: "Incorrect password" });

    await prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: [] },
    });
    return res.json({ ok: true, twoFactorEnabled: false });
  } catch (err) {
    console.error("disableTwoFactor error", err);
    return res.status(500).json({ message: "Server error" });
  }
}
