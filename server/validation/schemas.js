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
const roleSchema = z.enum(["member", "editor", "viewer"]).default("member");

export const createBoardSchema = z.object({
  title: z.string().trim().min(1).max(120),
});

export const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: roleSchema,
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: roleSchema,
});
