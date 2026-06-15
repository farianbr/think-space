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
// Assignable collaborator roles. "owner" is implicit (Board.ownerId) and never
// assigned here. "member" is kept as a legacy alias (treated as editor).
const roleSchema = z
  .enum(["admin", "editor", "commenter", "viewer", "member"])
  .default("editor");

export const createBoardSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).optional(),
  icon: z.string().trim().max(40).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
    .optional(),
});

export const updateBoardSchema = z
  .object({
    title: z.string().trim().min(1).max(120).optional(),
    description: z.string().trim().max(500).nullable().optional(),
    icon: z.string().trim().max(40).nullable().optional(),
    color: z
      .string()
      .trim()
      .regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
      .nullable()
      .optional(),
    isArchived: z.boolean().optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });

export const addMemberSchema = z.object({
  userId: z.string().min(1),
  role: roleSchema,
});

export const inviteMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  role: roleSchema,
});

export const updateMemberRoleSchema = z.object({
  role: z.enum(["admin", "editor", "commenter", "viewer", "member"]),
});

// profile
export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    avatarUrl: z.string().trim().url().max(500).nullable().optional(),
    preferences: z.record(z.string(), z.any()).optional(),
  })
  .refine((d) => Object.keys(d).length > 0, { message: "No fields to update" });
