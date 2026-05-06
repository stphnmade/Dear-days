const RECURRING_SPECIAL_DAY_TYPES = new Set([
  "birthday",
  "anniversary",
  "wedding",
  "memorial",
]);

function startOfLocalDay(date: Date) {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  return out;
}

function daysInMonth(year: number, monthIndex: number) {
  return new Date(year, monthIndex + 1, 0).getDate();
}

function occurrenceInYear(source: Date, year: number) {
  const month = source.getMonth();
  const day = Math.min(source.getDate(), daysInMonth(year, month));
  const occurrence = new Date(source);
  occurrence.setFullYear(year, month, day);
  return occurrence;
}

export function isRecurringSpecialDayType(type: string | null | undefined) {
  return RECURRING_SPECIAL_DAY_TYPES.has(String(type ?? "").toLowerCase());
}

export function nextSpecialDayOccurrence(
  date: Date,
  type: string | null | undefined,
  reference = new Date()
) {
  if (!isRecurringSpecialDayType(type)) return date;

  const today = startOfLocalDay(reference);
  const thisYear = occurrenceInYear(date, reference.getFullYear());
  if (thisYear >= today) return thisYear;
  return occurrenceInYear(date, reference.getFullYear() + 1);
}
