import { z } from "zod";

const YMD_RE = /^\d{4}-\d{2}-\d{2}$/;
const MDY_RE = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;

function toYmd(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return null;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const dt = new Date(year, month - 1, day);
  if (
    dt.getFullYear() !== year ||
    dt.getMonth() !== month - 1 ||
    dt.getDate() !== day
  ) {
    return null;
  }
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export function normalizeDateInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  if (YMD_RE.test(raw)) return raw;

  const mdy = raw.match(MDY_RE);
  if (mdy) {
    const month = Number(mdy[1]);
    const day = Number(mdy[2]);
    const year = Number(mdy[3]);
    return toYmd(year, month, day);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return toYmd(parsed.getFullYear(), parsed.getMonth() + 1, parsed.getDate());
}

export const specialDaySchema = z.object({
  title: z.string().trim().min(1),
  type: z.enum(["birthday", "anniversary", "wedding", "memorial", "other"]),
  date: z.preprocess(
    (value) => normalizeDateInput(value) ?? "",
    z.string().regex(YMD_RE, "Enter a valid date.")
  ),
  person: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable(),
});

export const familyMemberSchema = z.object({
  name: z.string().trim().min(1),
  email: z.string().trim().email().optional().nullable(),
  relation: z.string().trim().optional().nullable(),
  color: z.string().trim().optional().nullable(),
});
