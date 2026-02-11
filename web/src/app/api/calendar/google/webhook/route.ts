import { headers } from "next/headers";
import { db } from "@/lib/db";
import { importGoogleSpecialDays } from "@/lib/google";
import { getPrimaryFamilyId } from "@/lib/family";
import { normalizeCalendarScopes } from "@/lib/connections";

// Google posts notifications with X-Goog-* headers
export async function POST() {
  const h = await headers();
  const channelId = h.get("X-Goog-Channel-ID") || "";
  const resourceId = h.get("X-Goog-Resource-ID") || "";
  const webhookToken = h.get("X-Goog-Channel-Token") || "";
  const state = h.get("X-Goog-Resource-State") || "";

  if (!channelId || !resourceId) {
    return new Response("ignored");
  }

  const acct = await db.account.findFirst({
    where: { channelId, resourceId },
    select: { userId: true, webhookSecret: true },
  });
  if (!acct) return new Response("ok");

  if (acct.webhookSecret && acct.webhookSecret !== webhookToken) {
    return new Response("forbidden", { status: 403 });
  }

  // "sync" indicates resource changes; "exists" is startup handshake.
  if (state !== "sync" && state !== "exists") {
    return new Response("ok");
  }

  const user = await db.user.findUnique({
    where: { id: acct.userId },
    select: {
      syncPaused: true,
      googlePullEnabled: true,
      syncBirthdays: true,
      syncGroupMeetings: true,
      syncReminders: true,
      googleCalendarScopes: true,
    },
  });
  if (!user || user.syncPaused || !user.googlePullEnabled) {
    return new Response("ok");
  }

  const familyId = await getPrimaryFamilyId(acct.userId);
  if (!familyId) return new Response("ok");

  const scopedCalendars = normalizeCalendarScopes(user.googleCalendarScopes);

  try {
    await importGoogleSpecialDays({
      userId: acct.userId,
      familyId,
      calendarIds: scopedCalendars.length > 0 ? scopedCalendars : ["primary"],
      migrateAll: true,
      syncBirthdays: user.syncBirthdays,
      syncGroupMeetings: user.syncGroupMeetings,
      syncReminders: user.syncReminders,
    });

    await db.user.update({
      where: { id: acct.userId },
      data: { lastGlobalRefreshAt: new Date() },
    });
  } catch (error) {
    console.error("google webhook sync failed", error);
  }

  return new Response("ok");
}
