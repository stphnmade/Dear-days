import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { buildIcsCalendar, verifyIcalFeedToken } from "@/lib/ical";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const familyId = url.searchParams.get("familyId");
  const token = url.searchParams.get("token");

  if (!familyId || !token) {
    return new NextResponse("Missing familyId or token", { status: 400 });
  }

  if (!verifyIcalFeedToken(familyId, token)) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let family: {
    id: string;
    name: string;
    calendarLabel: string | null;
    eventNameTemplate: string | null;
  } | null = null;
  try {
    family = await db.family.findUnique({
      where: { id: familyId },
      select: {
        id: true,
        name: true,
        calendarLabel: true,
        eventNameTemplate: true,
      },
    });
  } catch (error: any) {
    const msg = String(error?.message ?? "");
    if (
      !msg.includes("calendarLabel") &&
      !msg.includes("eventNameTemplate")
    ) {
      throw error;
    }
    const legacyFamily = await db.family.findUnique({
      where: { id: familyId },
      select: { id: true, name: true },
    });
    family = legacyFamily
      ? {
          ...legacyFamily,
          calendarLabel: null,
          eventNameTemplate: "{{title}}",
        }
      : null;
  }
  if (!family) return new NextResponse("Family not found", { status: 404 });

  const events = await db.specialDay.findMany({
    where: { familyId },
    orderBy: { date: "asc" },
    select: {
      id: true,
      title: true,
      type: true,
      date: true,
      person: true,
      notes: true,
    },
    take: 5000,
  });

  const ics = buildIcsCalendar(events, {
    calendarName: family.calendarLabel ?? `${family.name} Calendar`,
    groupName: family.name,
    eventNameTemplate: family.eventNameTemplate,
  });
  const filenameBase = (family.calendarLabel || family.name || "dear-days")
    .replace(/\s+/g, "-")
    .toLowerCase();
  const filename = `${filenameBase}.ics`;

  return new NextResponse(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, max-age=300",
    },
  });
}
