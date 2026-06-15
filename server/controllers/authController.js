import { prisma } from "../prismaClient.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import otplib from "otplib";

const { authenticator } = otplib;
import { registerSchema, loginSchema } from "../validation/schemas.js";
import { findRecoveryCodeMatch } from "../lib/recoveryCodes.js";

const JWT_SECRET = process.env.JWT_SECRET;

/** shape helper to avoid leaking fields */
function toPublicUser(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    createdAt: u.createdAt,
    twoFactorEnabled: u.twoFactorEnabled ?? false,
    twoFactorRecoveryCodesRemaining: (u.twoFactorRecoveryCodes ?? []).length,
  };
}

export async function register(req, res) {
  try {
    const { email, name, password } = registerSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return res.status(409).json({ error: "Email already in use" });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { email, name, password: hash },
    });

    // issue token on register for better UX
    const token = jwt.sign({ sub: user.id, name: name }, JWT_SECRET, { expiresIn: "7d" });

    return res.status(201).json({ user: toPublicUser(user), token });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function login(req, res) {
  try {
    const { email, password, code } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    // Second factor: when enabled, the password step alone returns a challenge.
    if (user.twoFactorEnabled) {
      if (!code) return res.json({ twoFactorRequired: true });
      const raw = String(code).trim();
      let valid = false;
      if (/^\d{6}$/.test(raw)) {
        // A 6-digit value is a TOTP code from the authenticator app.
        valid = authenticator.verify({ token: raw, secret: user.twoFactorSecret || "" });
      } else {
        // Otherwise treat it as a single-use recovery code; consume on match.
        const idx = await findRecoveryCodeMatch(raw, user.twoFactorRecoveryCodes || []);
        if (idx >= 0) {
          valid = true;
          const remaining = user.twoFactorRecoveryCodes.filter((_, i) => i !== idx);
          await prisma.user.update({
            where: { id: user.id },
            data: { twoFactorRecoveryCodes: remaining },
          });
          user.twoFactorRecoveryCodes = remaining;
        }
      }
      if (!valid) return res.status(401).json({ error: "Invalid authentication code" });
    }

    const token = jwt.sign({ sub: user.id, name: user.name }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({ user: toPublicUser(user), token });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

export async function getMe(req, res) {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, email: true, name: true, avatarUrl: true, preferences: true, twoFactorEnabled: true, twoFactorRecoveryCodes: true, createdAt: true }
    });
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    // Expose only the remaining count, never the (hashed) codes themselves.
    const { twoFactorRecoveryCodes, ...rest } = user;
    res.json({
      user: { ...rest, twoFactorRecoveryCodesRemaining: (twoFactorRecoveryCodes ?? []).length },
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(500).json({ error: "Server error" });
  }
}
