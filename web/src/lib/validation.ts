import { z } from "zod";

export const specialDaySchema = z.object({
  title: z.string().trim().min(1),
  type: z.enum(["birthday", "anniversary", "wedding", "other"]),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // YYYY-MM-DD
  person: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const familyMemberSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().optional().nullable(),
  relation: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable(),
});
