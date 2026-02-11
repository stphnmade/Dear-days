const HHMM_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function normalizeOptionalTimeInput(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const raw = value.trim();
  if (!raw) return null;
  return HHMM_RE.test(raw) ? raw : null;
}

export function combineDateAndOptionalTime(dateYmd: string, timeHm?: string | null): Date {
  const [y, m, d] = dateYmd.split("-").map(Number);
  const normalized = normalizeOptionalTimeInput(timeHm ?? null);

  if (normalized) {
    const [hh, mm] = normalized.split(":").map(Number);
    return new Date(y, m - 1, d, hh, mm, 0, 0);
  }

  // Keep all-day events at noon local time to avoid timezone date drift.
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

export function toOptionalTimeInputValue(date: Date): string {
  // Historical all-day events were stored at noon; treat noon as all-day.
  if (date.getHours() === 12 && date.getMinutes() === 0 && date.getSeconds() === 0) {
    return "";
  }
  const hh = String(date.getHours()).padStart(2, "0");
  const mm = String(date.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function isAllDayStoredDate(date: Date): boolean {
  return date.getHours() === 12 && date.getMinutes() === 0 && date.getSeconds() === 0;
}
