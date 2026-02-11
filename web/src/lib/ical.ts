import crypto from "node:crypto";

type SpecialType = "birthday" | "anniversary" | "wedding" | "memorial" | "other";

export type ParsedIcalEvent = {
  uid: string | null;
  summary: string;
  description: string | null;
  date: Date;
  looksSpecial: boolean;
  recurringYearly: boolean;
};

function unfoldIcalLines(input: string) {
  const lines = input.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
  const unfolded: string[] = [];

  for (const line of lines) {
    if (!line) continue;
    if ((line.startsWith(" ") || line.startsWith("\t")) && unfolded.length) {
      unfolded[unfolded.length - 1] += line.slice(1);
    } else {
      unfolded.push(line);
    }
  }

  return unfolded;
}

function unescapeIcalText(value: string) {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\")
    .trim();
}

function parseIcalDate(value: string): Date | null {
  const v = value.trim();

  if (/^\d{8}$/.test(v)) {
    const y = Number(v.slice(0, 4));
    const m = Number(v.slice(4, 6));
    const d = Number(v.slice(6, 8));
    return new Date(y, m - 1, d, 12);
  }

  const dt = v.match(/^(\d{8})T(\d{6})(Z)?$/);
  if (dt) {
    const datePart = dt[1];
    const timePart = dt[2];
    const hasZ = Boolean(dt[3]);
    const y = Number(datePart.slice(0, 4));
    const m = Number(datePart.slice(4, 6));
    const d = Number(datePart.slice(6, 8));
    const hh = Number(timePart.slice(0, 2));
    const mm = Number(timePart.slice(2, 4));
    const ss = Number(timePart.slice(4, 6));

    if (hasZ) {
      return new Date(Date.UTC(y, m - 1, d, hh, mm, ss));
    }
    return new Date(y, m - 1, d, hh, mm, ss);
  }

  return null;
}

function guessType(summary: string): SpecialType {
  if (/birthday|bday|born/i.test(summary)) return "birthday";
  if (/anniversary/i.test(summary)) return "anniversary";
  if (/wedding/i.test(summary)) return "wedding";
  return "other";
}

export function derivePerson(summary: string): string | null {
  const stripped = summary
    .replace(/’s|s’|'s/gi, "")
    .replace(/birthday|anniversary|wedding|bday|born/gi, "")
    .replace(/\s+/g, " ")
    .trim();
  return stripped.length ? stripped : null;
}

export function parseIcal(input: string): ParsedIcalEvent[] {
  const lines = unfoldIcalLines(input);
  const events: ParsedIcalEvent[] = [];

  let inEvent = false;
  let fields: Record<string, string[]> = {};

  for (const line of lines) {
    if (line.toUpperCase() === "BEGIN:VEVENT") {
      inEvent = true;
      fields = {};
      continue;
    }

    if (line.toUpperCase() === "END:VEVENT") {
      inEvent = false;
      const summaryRaw = fields.SUMMARY?.[0];
      const dtStartRaw = fields.DTSTART?.[0];

      if (!summaryRaw || !dtStartRaw) continue;

      const parsedDate = parseIcalDate(dtStartRaw);
      if (!parsedDate) continue;

      const summary = unescapeIcalText(summaryRaw);
      const description = fields.DESCRIPTION?.[0]
        ? unescapeIcalText(fields.DESCRIPTION[0])
        : null;
      const uid = fields.UID?.[0]?.trim() || null;
      const rrule = fields.RRULE?.[0]?.toUpperCase() ?? "";
      const recurringYearly = rrule.includes("FREQ=YEARLY");
      const looksSpecial = guessType(summary) !== "other";

      events.push({
        uid,
        summary,
        description,
        date: parsedDate,
        looksSpecial,
        recurringYearly,
      });
      continue;
    }

    if (!inEvent) continue;

    const idx = line.indexOf(":");
    if (idx < 1) continue;

    const rawKey = line.slice(0, idx);
    const value = line.slice(idx + 1);
    const key = rawKey.split(";")[0].toUpperCase();
    if (!fields[key]) fields[key] = [];
    fields[key].push(value);
  }

  return events;
}

export function stableIcalExternalId(event: ParsedIcalEvent) {
  if (event.uid) return event.uid;
  const raw = `${event.summary}|${event.date.toISOString()}|${event.description ?? ""}`;
  return `ical-${crypto.createHash("sha256").update(raw).digest("hex").slice(0, 32)}`;
}

export function inferSpecialType(summary: string): SpecialType {
  return guessType(summary);
}

function applyEventTemplate(
  template: string | null | undefined,
  input: { title: string; person: string; group: string }
) {
  const tpl = (template ?? "{{title}}").trim() || "{{title}}";
  const rendered = tpl
    .replaceAll("{{title}}", input.title)
    .replaceAll("{{person}}", input.person)
    .replaceAll("{{group}}", input.group)
    .replace(/\s+/g, " ")
    .trim();
  return rendered || input.title;
}

function escapeIcsText(value: string | null | undefined) {
  if (!value) return "";
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function ymd(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function utcStamp(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mm = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

export function buildIcsCalendar(
  events: Array<{
    id: string;
    title: string | null;
    type: string;
    date: Date;
    person: string | null;
    notes: string | null;
  }>,
  options?: {
    calendarName?: string | null;
    groupName?: string | null;
    eventNameTemplate?: string | null;
  }
) {
  const now = new Date();
  const groupName = options?.groupName ?? "Group";
  const calendarName =
    options?.calendarName?.trim() || `${groupName} Calendar`;
  const eventNameTemplate = options?.eventNameTemplate ?? "{{title}}";
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dear Days//Family Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    `X-WR-CALNAME:${escapeIcsText(calendarName)}`,
    "X-WR-TIMEZONE:UTC",
  ];

  for (const ev of events) {
    const title = ev.title ?? ev.person ?? "Special Day";
    const summary = applyEventTemplate(eventNameTemplate, {
      title,
      person: ev.person ?? "",
      group: groupName,
    });
    lines.push("BEGIN:VEVENT");
    lines.push(`UID:${ev.id}@deardays`);
    lines.push(`DTSTAMP:${utcStamp(now)}`);
    lines.push(`DTSTART;VALUE=DATE:${ymd(ev.date)}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    if (ev.notes) lines.push(`DESCRIPTION:${escapeIcsText(ev.notes)}`);
    if (["birthday", "anniversary", "wedding", "memorial"].includes(ev.type)) {
      lines.push("RRULE:FREQ=YEARLY");
    }
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return `${lines.join("\r\n")}\r\n`;
}

export function createIcalFeedToken(familyId: string) {
  const secret = process.env.CALENDAR_FEED_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) return null;
  return crypto.createHmac("sha256", secret).update(`ical:${familyId}`).digest("hex");
}

export function verifyIcalFeedToken(familyId: string, token: string) {
  const expected = createIcalFeedToken(familyId);
  if (!expected) return false;
  if (expected.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
}
