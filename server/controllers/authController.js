import { prisma } from "../prismaClient.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import otplib from "otplib";

const { authenticator } = otplib;
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validation/schemas.js";
import { findRecoveryCodeMatch } from "../lib/recoveryCodes.js";
import { applyPendingInvitesForUser } from "./invitesController.js";
import { sendPasswordResetEmail } from "../lib/mailer.js";

const JWT_SECRET = process.env.JWT_SECRET;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// How long a password-reset link stays valid.
const RESET_TOKEN_TTL = "1h";
const RESET_TOKEN_TTL_LABEL = "1 hour";

// Per-user signing secret for reset tokens. Mixing in the current password hash
// makes the token single-use: once the password changes, the hash changes and
// any previously issued token (and any reused one) no longer verifies.
function resetTokenSecret(user) {
  return `${JWT_SECRET}:pwreset:${user.password}`;
}

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

    // Attach any boards this email was invited to before signing up.
    await applyPendingInvitesForUser(user);

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

/**
 * Start the password-reset flow. Always responds 200 with the same body so the
 * endpoint can't be used to discover which emails have accounts. When the email
 * does belong to a user we issue a short-lived signed token and email the link.
 */
export async function forgotPassword(req, res) {
  try {
    const { email } = forgotPasswordSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (user) {
      const token = jwt.sign(
        { sub: user.id, purpose: "pwreset" },
        resetTokenSecret(user),
        { expiresIn: RESET_TOKEN_TTL }
      );
      const resetUrl = `${FRONTEND_URL}/reset-password?token=${encodeURIComponent(token)}`;
      // Fire-and-forget delivery; never block or leak the result to the client.
      await sendPasswordResetEmail({
        to: user.email,
        name: user.name,
        resetUrl,
        expiresLabel: RESET_TOKEN_TTL_LABEL,
      });
    }

    return res.json({ ok: true });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}

/**
 * Complete the reset: verify the token against the user's current password hash
 * and, if valid and unexpired, set the new password.
 */
export async function resetPassword(req, res) {
  try {
    const { token, password } = resetPasswordSchema.parse(req.body);

    // Read the unverified payload only to locate the user; verification below
    // is what actually authenticates the token.
    const decoded = jwt.decode(token);
    if (!decoded?.sub || decoded.purpose !== "pwreset") {
      return res.status(400).json({ error: "This reset link is invalid or has expired." });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user) {
      return res.status(400).json({ error: "This reset link is invalid or has expired." });
    }

    try {
      jwt.verify(token, resetTokenSecret(user));
    } catch {
      return res.status(400).json({ error: "This reset link is invalid or has expired." });
    }

    const hash = await bcrypt.hash(password, 10);
    await prisma.user.update({ where: { id: user.id }, data: { password: hash } });

    return res.json({ ok: true });
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
