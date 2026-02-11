import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { listGoogleCalendarsForUser } from "@/lib/google";
import { normalizeCalendarScopes } from "@/lib/connections";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const account = await db.account.findFirst({
    where: { userId, provider: "google" },
    select: { id: true },
  });
  if (!account) {
    return NextResponse.json({ error: "Google account not connected" }, { status: 400 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { googleCalendarScopes: true },
  });

  const selectedCalendarIds = normalizeCalendarScopes(user?.googleCalendarScopes);

  try {
    const calendars = await listGoogleCalendarsForUser(userId);
    return NextResponse.json({ ok: true, calendars, selectedCalendarIds });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch calendar list" },
      { status: 500 }
    );
  }
}
