// src/app/connections/page.tsx
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { db } from "@/lib/db";
import { importGoogleSpecialDays } from "@/lib/google";
import { revalidatePath } from "next/cache";

export default async function ConnectionsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;

  const userId = session.user.id;
  const google = await db.account.findFirst({
    where: { userId, provider: "google" },
  });

  // If you already have a helper like getOrCreateDefaultFamily(), feel free to replace this
  const family = await db.family.findFirst({ where: { ownerId: userId } });

  async function importNow() {
    "use server";
    if (!family) return;
    await importGoogleSpecialDays({
      userId,
      familyId: family.id,
      calendarId: "primary",
    });
    revalidatePath("/events");
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Connections</h1>

      <div className="rounded-xl border p-4">
        <div className="font-medium">Google Calendar</div>
        <div className="text-sm opacity-75">
          Status: {google ? "Connected" : "Not connected"}
        </div>

        {google ? (
          <form action={importNow} className="mt-3">
            <button className="rounded-xl border px-4 py-2 hover:opacity-90">
              Import from Google Calendar
            </button>
          </form>
        ) : (
          <a
            href="/api/auth/signin"
            className="mt-3 inline-block rounded-xl border px-4 py-2 hover:opacity-90"
          >
            Connect Google
          </a>
        )}
      </div>
    </div>
  );
}
