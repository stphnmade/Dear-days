import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { mapSyncSettings, settingsUpdateDataFromBody } from "@/lib/connections";

async function getCurrentUserId() {
  const session = await getServerSession(authOptions);
  return session?.user?.id ?? null;
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      syncPaused: true,
      conflictHandling: true,
      defaultEventDestination: true,
      syncBirthdays: true,
      syncGroupMeetings: true,
      syncReminders: true,
      googlePullEnabled: true,
      googlePushEnabled: true,
      googleCalendarScopes: true,
      lastGlobalRefreshAt: true,
    },
  });

  if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

  return NextResponse.json({ ok: true, settings: mapSyncSettings(user) });
}

export async function POST(req: Request) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: Record<string, unknown> = {};
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const data = settingsUpdateDataFromBody(body);
  if (!Object.keys(data).length) {
    return NextResponse.json({ error: "No valid settings provided" }, { status: 400 });
  }

  const user = await db.user.update({
    where: { id: userId },
    data,
    select: {
      syncPaused: true,
      conflictHandling: true,
      defaultEventDestination: true,
      syncBirthdays: true,
      syncGroupMeetings: true,
      syncReminders: true,
      googlePullEnabled: true,
      googlePushEnabled: true,
      googleCalendarScopes: true,
      lastGlobalRefreshAt: true,
    },
  });

  return NextResponse.json({ ok: true, settings: mapSyncSettings(user) });
}
