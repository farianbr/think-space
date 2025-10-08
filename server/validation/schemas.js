import { z } from "zod";

// auth schemas
export const registerSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  name: z.string().trim().min(1).max(80),
  password: z.string().min(8).max(72),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(72),
});

// board schemas
export const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: z.string().optional().default("member"),
});
