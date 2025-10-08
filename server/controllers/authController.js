import { prisma } from "../prismaClient.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { registerSchema, loginSchema } from "../validation/schemas.js";

const JWT_SECRET = process.env.JWT_SECRET;

/** shape helper to avoid leaking fields */
function toPublicUser(u) {
  return { id: u.id, email: u.email, name: u.name, createdAt: u.createdAt };
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
    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });

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
    const { email, password } = loginSchema.parse(req.body);

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = jwt.sign({ sub: user.id }, JWT_SECRET, { expiresIn: "7d" });

    return res.json({ user: toPublicUser(user), token });
  } catch (err) {
    if (err.name === "ZodError") {
      return res.status(400).json({ error: "Invalid input", details: err.errors });
    }
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
}
