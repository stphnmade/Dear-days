import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { specialDaySchema } from "@/lib/validation";
import { getPrimaryFamilyId } from "@/lib/family";
import { pushSpecialDayToGoogle } from "@/lib/google";
import { normalizeDefaultDestination } from "@/lib/connections";
import { combineDateAndOptionalTime, normalizeOptionalTimeInput } from "@/lib/event-datetime";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = (session.user as any).id as string;

  let payload: any = {};
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const parsed = specialDaySchema.safeParse({
    title: payload.title,
    type: payload.type || "other",
    date: payload.date,
    person: payload.person || null,
    notes: payload.notes || null,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  }

  const userPrefs = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      syncPaused: true,
      googlePushEnabled: true,
      defaultEventDestination: true,
    },
  });
  if (!userPrefs) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const requestedScope =
    payload.scope === "family"
      ? "family"
      : payload.scope === "personal"
      ? "personal"
      : null;
  const defaultDestination = normalizeDefaultDestination(
    userPrefs.defaultEventDestination
  );
  const scope =
    requestedScope ??
    (defaultDestination === "GROUP_SHARED" ? "family" : "personal");
  const targetFamilyId =
    typeof payload.targetFamilyId === "string" ? payload.targetFamilyId.trim() : "";

  let familyId: string | undefined;
  let resolvedFamilyGoogleCalendarId: string | null = null;
  if (scope === "family") {
    const fallbackFamilyId = await getPrimaryFamilyId(userId);
    const effectiveFamilyId = targetFamilyId || fallbackFamilyId;
    if (!effectiveFamilyId) {
      return NextResponse.json({ error: "No group selected." }, { status: 400 });
    }

    let family:
      | {
          id: string;
          ownerId: string;
          allowMemberPosting: boolean;
          googleCalendarId: string | null;
        }
      | null = null;
    try {
      family = await prisma.family.findFirst({
        where: {
          id: effectiveFamilyId,
          OR: [{ ownerId: userId }, { members: { some: { joinedUserId: userId } } }],
        },
        select: {
          id: true,
          ownerId: true,
          allowMemberPosting: true,
          googleCalendarId: true,
        },
      });
    } catch (error: any) {
      const msg = String(error?.message ?? "");
      if (!msg.includes("allowMemberPosting")) throw error;
      const legacyFamily = await prisma.family.findFirst({
        where: {
          id: effectiveFamilyId,
          OR: [{ ownerId: userId }, { members: { some: { joinedUserId: userId } } }],
        },
        select: { id: true, ownerId: true },
      });
      family = legacyFamily
        ? { ...legacyFamily, allowMemberPosting: true, googleCalendarId: null }
        : null;
    }
    if (!family) {
      return NextResponse.json(
        { error: "You do not have access to this group." },
        { status: 403 }
      );
    }
    const isOwner = family.ownerId === userId;
    if (!isOwner && !family.allowMemberPosting) {
      return NextResponse.json(
        { error: "Only owners can post dates to this group." },
        { status: 403 }
      );
    }
    familyId = family.id;
    resolvedFamilyGoogleCalendarId = family.googleCalendarId ?? null;
  }

  const { title, type, date, person, notes } = parsed.data;
  const rawTime =
    typeof payload.time === "string" ? payload.time.trim() : "";
  const timeInput = normalizeOptionalTimeInput(rawTime);
  if (rawTime && !timeInput) {
    return NextResponse.json({ error: "Enter a valid time (HH:MM)." }, { status: 400 });
  }
  const dt = combineDateAndOptionalTime(date, timeInput);

  const created = await prisma.specialDay.create({
    data: {
      familyId,
      userId,
      title,
      type,
      date: dt,
      person: person || undefined,
      notes: notes || undefined,
    },
    select: { id: true },
  });

  const shouldPushToGoogle =
    userPrefs.googlePushEnabled &&
    !userPrefs.syncPaused &&
    defaultDestination !== "DEAR_DAYS_LOCAL";
  if (shouldPushToGoogle) {
    const calendarId =
      defaultDestination === "GOOGLE_PRIMARY"
        ? "primary"
        : resolvedFamilyGoogleCalendarId ?? "primary";
    try {
      await pushSpecialDayToGoogle({
        userId,
        specialDayId: created.id,
        calendarId,
      });
    } catch (error) {
      console.error("event push to google failed", error);
    }
  }

  return NextResponse.json({ ok: true, id: created.id });
}
