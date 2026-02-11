import { addMonths, isAfter } from "date-fns";
import { calendar_v3, google } from "googleapis";
import { db } from "@/lib/db";

type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  calendars: Array<{
    calendarId: string;
    created: number;
    updated: number;
    skipped: number;
  }>;
  preview: boolean;
};

function dedupeCalendarIds(input: string[]) {
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of input) {
    const id = raw.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function isBirthdayLike(title: string, eventType: string | null | undefined) {
  return (
    eventType === "birthday" ||
    /birthday|bday|anniversary|wedding|born|memorial/i.test(title)
  );
}

function isReminderLike(title: string, eventType: string | null | undefined) {
  return (
    /reminder|remind|todo|task/i.test(title) ||
    eventType === "outOfOffice" ||
    eventType === "fromGmail"
  );
}

function dayYmd(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Build an OAuth2 client for the user's Google account.
 * Reads/refreshes tokens from NextAuth Account table.
 */
export async function getGoogleClientForUser(userId: string) {
  const account = await db.account.findFirst({
    where: { userId, provider: "google" },
  });
  if (!account?.access_token) return null;

  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID!,
    process.env.GOOGLE_CLIENT_SECRET!,
    `${process.env.NEXTAUTH_URL}/api/auth/callback/google`
  );

  oauth2.setCredentials({
    access_token: account.access_token || undefined,
    refresh_token: account.refresh_token || undefined,
    expiry_date: account.expires_at ? account.expires_at * 1000 : undefined,
    scope: account.scope || undefined,
    token_type: account.token_type || undefined,
    id_token: account.id_token || undefined,
  });

  // Refresh if expired
  try {
    const expired =
      !account.expires_at ||
      isAfter(new Date(), new Date(account.expires_at * 1000));
    if (expired && account.refresh_token) {
      const { credentials } = await oauth2.refreshAccessToken();
      await db.account.update({
        where: { id: account.id },
        data: {
          access_token:
            credentials.access_token ?? account.access_token ?? null,
          refresh_token:
            credentials.refresh_token ?? account.refresh_token ?? null,
          expires_at: credentials.expiry_date
            ? Math.floor(credentials.expiry_date / 1000)
            : account.expires_at ?? null,
          scope: credentials.scope ?? account.scope ?? null,
          token_type: credentials.token_type ?? account.token_type ?? null,
          id_token: (credentials as any).id_token ?? account.id_token ?? null,
        },
      });
      oauth2.setCredentials(credentials);
    }
  } catch (err) {
    console.error("Google token refresh failed", err);
  }

  return oauth2;
}

export async function listGoogleCalendarsForUser(userId: string) {
  const oauth2 = await getGoogleClientForUser(userId);
  if (!oauth2) throw new Error("Google account not connected");

  const calendarClient = google.calendar({ version: "v3", auth: oauth2 });
  const calendars: Array<{
    id: string;
    summary: string;
    primary: boolean;
    accessRole: string;
  }> = [];

  let pageToken: string | undefined;
  do {
    const res = await calendarClient.calendarList.list({
      maxResults: 250,
      pageToken,
    });
    pageToken = res.data.nextPageToken ?? undefined;

    for (const item of res.data.items ?? []) {
      if (!item.id) continue;
      calendars.push({
        id: item.id,
        summary: item.summary ?? item.id,
        primary: Boolean(item.primary),
        accessRole: item.accessRole ?? "unknown",
      });
    }
  } while (pageToken);

  calendars.sort((a, b) => {
    if (a.primary && !b.primary) return -1;
    if (!a.primary && b.primary) return 1;
    return a.summary.localeCompare(b.summary);
  });

  return calendars;
}

/**
 * Import "special day" events into a family.
 * First run: full scan (timeMin/timeMax). Subsequent runs: incremental via syncToken.
 */
export async function importGoogleSpecialDays(params: {
  userId: string;
  familyId: string;
  calendarId?: string;
  calendarIds?: string[];
  migrateAll?: boolean;
  dryRun?: boolean;
  syncBirthdays?: boolean;
  syncGroupMeetings?: boolean;
  syncReminders?: boolean;
}): Promise<ImportResult> {
  const { userId, familyId } = params;
  const migrateAll = params.migrateAll ?? false;
  const dryRun = params.dryRun ?? false;
  const syncBirthdays = params.syncBirthdays ?? true;
  const syncGroupMeetings = params.syncGroupMeetings ?? true;
  const syncReminders = params.syncReminders ?? true;

  const selectedCalendarIds = dedupeCalendarIds(
    params.calendarIds?.length
      ? params.calendarIds
      : [params.calendarId ?? "primary"]
  );

  const oauth2 = await getGoogleClientForUser(userId);
  if (!oauth2) throw new Error("Google account not connected");

  const calendarClient = google.calendar({ version: "v3", auth: oauth2 });

  const family = await db.family.findUnique({
    where: { id: familyId },
    select: { id: true, googleSyncToken: true, googleCalendarId: true },
  });

  const calendarStats: ImportResult["calendars"] = [];
  let totalCreated = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;

  const incrementalEnabled =
    !dryRun &&
    selectedCalendarIds.length === 1 &&
    family?.googleSyncToken &&
    family.googleCalendarId === selectedCalendarIds[0];

  for (const calendarId of selectedCalendarIds) {
    const fullArgs: calendar_v3.Params$Resource$Events$List = {
      calendarId,
      maxResults: 2500,
      singleEvents: true,
      showDeleted: false,
      timeMin: new Date().toISOString(),
      timeMax: addMonths(new Date(), 18).toISOString(),
    };

    const incrementalArgs: calendar_v3.Params$Resource$Events$List | null =
      incrementalEnabled
        ? {
            calendarId,
            maxResults: 2500,
            syncToken: family?.googleSyncToken ?? undefined,
          }
        : null;

    const runList = async (
      args: calendar_v3.Params$Resource$Events$List
    ): Promise<{
      created: number;
      updated: number;
      skipped: number;
      nextSyncToken?: string;
    }> => {
      let pageToken: string | undefined;
      let created = 0;
      let updated = 0;
      let skipped = 0;
      let nextSyncToken: string | undefined;

      do {
        const res = await calendarClient.events.list({ ...args, pageToken });
        pageToken = res.data.nextPageToken ?? undefined;
        if (res.data.nextSyncToken) nextSyncToken = res.data.nextSyncToken;

        for (const ev of res.data.items ?? []) {
          const title = (ev.summary ?? "").trim();
          const isAllDay = !!ev.start?.date;
          const birthdayLike = isBirthdayLike(title, ev.eventType);
          const reminderLike = isReminderLike(title, ev.eventType);
          const groupMeetingLike = !birthdayLike && !reminderLike;
          const looksSpecial = birthdayLike;

          if (birthdayLike && !syncBirthdays) {
            skipped++;
            continue;
          }
          if (groupMeetingLike && !syncGroupMeetings) {
            skipped++;
            continue;
          }
          if (reminderLike && !syncReminders) {
            skipped++;
            continue;
          }

          if (!migrateAll && !isAllDay && !looksSpecial) {
            skipped++;
            continue;
          }

          if (!ev.id || !ev.start) {
            skipped++;
            continue;
          }

          const dateStr = ev.start.date ?? ev.start.dateTime;
          if (!dateStr) {
            skipped++;
            continue;
          }

          const when = new Date(dateStr);
          const kind = /anniversary|wedding/i.test(title)
            ? "anniversary"
            : /birthday|bday|born/i.test(title)
            ? "birthday"
            : /memorial/i.test(title)
            ? "memorial"
            : "other";

          const person =
            title
              .replace(/’s|s’|'s/gi, "")
              .replace(/birthday|anniversary|wedding|bday|born|memorial/gi, "")
              .trim() || null;

          const existing = await db.specialDay
            .findUnique({
              where: {
                familyId_externalId_calendarId: {
                  familyId,
                  externalId: ev.id,
                  calendarId,
                },
              },
            })
            .catch(() => null);

          if (dryRun) {
            if (existing) updated++;
            else created++;
            continue;
          }

          if (!existing) {
            await db.specialDay.create({
              data: {
                familyId,
                userId,
                title: title || kind,
                type: kind,
                date: when,
                person: person ?? undefined,
                notes: ev.description ?? undefined,
                source: "GOOGLE",
                externalId: ev.id,
                calendarId,
              },
            });
            created++;
          } else {
            await db.specialDay.update({
              where: { id: existing.id },
              data: {
                title: title || existing.title,
                type: kind,
                date: when,
                person: person ?? existing.person ?? undefined,
                notes: ev.description ?? existing.notes ?? undefined,
              },
            });
            updated++;
          }
        }
      } while (pageToken);

      return { created, updated, skipped, nextSyncToken };
    };

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let nextSyncToken: string | undefined;

    try {
      const first = await runList(incrementalArgs ?? fullArgs);
      created += first.created;
      updated += first.updated;
      skipped += first.skipped;
      nextSyncToken = first.nextSyncToken;
    } catch (err: any) {
      const code =
        err?.code || err?.response?.status || err?.response?.data?.error?.code;
      if (code === 410 && incrementalArgs?.syncToken) {
        if (!dryRun) {
          await db.family.update({
            where: { id: familyId },
            data: { googleSyncToken: null },
          });
        }
        const second = await runList(fullArgs);
        created += second.created;
        updated += second.updated;
        skipped += second.skipped;
        nextSyncToken = second.nextSyncToken;
      } else {
        console.error("Google Calendar import failed:", err?.message || err);
        throw err;
      }
    }

    if (!dryRun && nextSyncToken && selectedCalendarIds.length === 1) {
      await db.family.update({
        where: { id: familyId },
        data: {
          googleSyncToken: nextSyncToken,
          googleCalendarId: calendarId,
        },
      });
    }

    calendarStats.push({ calendarId, created, updated, skipped });
    totalCreated += created;
    totalUpdated += updated;
    totalSkipped += skipped;
  }

  return {
    created: totalCreated,
    updated: totalUpdated,
    skipped: totalSkipped,
    calendars: calendarStats,
    preview: dryRun,
  };
}

export async function pushSpecialDayToGoogle(params: {
  userId: string;
  specialDayId: string;
  calendarId?: string;
}) {
  const oauth2 = await getGoogleClientForUser(params.userId);
  if (!oauth2) return { pushed: false as const, reason: "GOOGLE_NOT_CONNECTED" };

  const specialDay = await db.specialDay.findUnique({
    where: { id: params.specialDayId },
    select: {
      id: true,
      title: true,
      type: true,
      date: true,
      notes: true,
      familyId: true,
      userId: true,
      externalId: true,
      calendarId: true,
    },
  });

  if (!specialDay) return { pushed: false as const, reason: "EVENT_NOT_FOUND" };
  if (specialDay.userId !== params.userId) {
    return { pushed: false as const, reason: "FORBIDDEN" };
  }

  const calendarId = params.calendarId ?? "primary";

  if (specialDay.externalId && specialDay.calendarId === calendarId) {
    return {
      pushed: true as const,
      reason: "ALREADY_PUSHED",
      calendarId,
      externalId: specialDay.externalId,
    };
  }

  const calendarClient = google.calendar({ version: "v3", auth: oauth2 });

  const start = new Date(specialDay.date);
  const startDate = dayYmd(start);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  const endDate = dayYmd(end);

  const summary = specialDay.title?.trim() || "Special Day";
  const description = specialDay.notes
    ? `${specialDay.notes}\n\nSynced from Dear Days`
    : "Synced from Dear Days";
  const recurring = ["birthday", "anniversary", "wedding", "memorial"].includes(
    specialDay.type
  );

  const inserted = await calendarClient.events.insert({
    calendarId,
    requestBody: {
      summary,
      description,
      start: { date: startDate },
      end: { date: endDate },
      recurrence: recurring ? ["RRULE:FREQ=YEARLY"] : undefined,
    },
  });

  const externalId = inserted.data.id ?? null;
  if (externalId) {
    await db.specialDay.update({
      where: { id: specialDay.id },
      data: {
        externalId,
        calendarId,
      },
    });
  }

  return {
    pushed: true as const,
    reason: "CREATED",
    calendarId,
    externalId,
  };
}
