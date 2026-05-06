import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { normalizeCalendarScopes } from "@/lib/connections";
import { getPrimaryFamilyId } from "@/lib/family";
import { importGoogleSpecialDays } from "@/lib/google";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const googleAccount = await db.account.findFirst({
      where: { userId, provider: "google" },
      select: { id: true },
    });
    if (!googleAccount) {
      return NextResponse.json(
        { error: "Google account not connected" },
        { status: 400 }
      );
    }

    let body: any = {};
    try {
      body = (await req.json()) ?? {};
    } catch {
      body = {};
    }

    const requestedFamilyId = String(body.familyId ?? "").trim();
    const familyId = requestedFamilyId || (await getPrimaryFamilyId(userId));
    if (!familyId) {
      return NextResponse.json(
        { error: "No group selected for Google sync" },
        { status: 400 }
      );
    }

    const family = await db.family.findFirst({
      where: {
        id: familyId,
        OR: [
          { ownerId: userId },
          { members: { some: { joinedUserId: userId } } },
        ],
      },
      select: { id: true },
    });
    if (!family) {
      return NextResponse.json(
        { error: "You do not have access to this group" },
        { status: 403 }
      );
    }

    const userPrefs = await db.user.findUnique({
      where: { id: userId },
      select: {
        syncPaused: true,
        syncBirthdays: true,
        syncGroupMeetings: true,
        syncReminders: true,
        googlePullEnabled: true,
        googleCalendarScopes: true,
      },
    });
    if (!userPrefs) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (userPrefs.syncPaused) {
      return NextResponse.json(
        { error: "All syncing is currently paused." },
        { status: 409 }
      );
    }
    if (!userPrefs.googlePullEnabled) {
      return NextResponse.json(
        { error: "Pull from Google is disabled in your connection settings." },
        { status: 409 }
      );
    }

    const selectedFromBody = Array.isArray(body.calendarIds)
      ? body.calendarIds.filter(
          (value: unknown): value is string => typeof value === "string"
        )
      : [];
    const selectedFromPrefs = normalizeCalendarScopes(
      userPrefs.googleCalendarScopes
    );
    const calendarIds =
      selectedFromBody.length > 0
        ? selectedFromBody
        : selectedFromPrefs.length > 0
        ? selectedFromPrefs
        : [typeof body.calendarId === "string" ? body.calendarId : "primary"];

    const dryRun = Boolean(body.dryRun);
    const result = await importGoogleSpecialDays({
      userId,
      familyId: family.id,
      calendarIds,
      migrateAll: Boolean(body.migrateAll),
      dryRun,
      syncBirthdays:
        typeof body.syncBirthdays === "boolean"
          ? body.syncBirthdays
          : userPrefs.syncBirthdays,
      syncGroupMeetings:
        typeof body.syncGroupMeetings === "boolean"
          ? body.syncGroupMeetings
          : userPrefs.syncGroupMeetings,
      syncReminders:
        typeof body.syncReminders === "boolean"
          ? body.syncReminders
          : userPrefs.syncReminders,
    });

    if (!dryRun) {
      await db.user.update({
        where: { id: userId },
        data: { lastGlobalRefreshAt: new Date() },
      });
    }

    return NextResponse.json({ ok: true, result });
  } catch (error: any) {
    console.error("Manual sync failed:", error);
    const message = error?.message ?? String(error);
    if (
      typeof message === "string" &&
      message.toLowerCase().includes("invalid_grant")
    ) {
      await db.account.updateMany({
        where: { userId, provider: "google" },
        data: { access_token: null, refresh_token: null, expires_at: null },
      });
      return NextResponse.json(
        {
          error:
            "invalid_grant: refresh token invalid or revoked. Please reconnect Google.",
        },
        { status: 400 }
      );
    }

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
