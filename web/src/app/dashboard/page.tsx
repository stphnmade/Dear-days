import { getServerSession } from "next-auth";
// Update the import path below to the correct location of authOptions:
// Update the import path below to the correct location of authOptions:
import { authOptions } from "@/lib/auth"; // ✅ not from the route path
import { prisma } from "@/lib/db";
// If your prisma client is located elsewhere, update the path accordingly.
// Example: import { prisma } from "../../../lib/db";
import Link from "next/link";

async function ensureFamily() {
  // call API from server (local fetch)
  await fetch(
    `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/api/family/ensure`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      cache: "no-store",
    }
  );
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return (
      <main className="p-8">
        <p>
          Please <Link href="/">sign in</Link>.
        </p>
      </main>
    );
  }

  // Make sure there is a family (best moved to a one-time action later)
  await ensureFamily();

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    include: {
      families: { include: { family: true } },
      events: { orderBy: { date: "asc" } },
    },
  });

  const days = await prisma.specialDay.findMany({
    where: { familyId: user?.families?.[0]?.familyId },
    orderBy: { date: "asc" },
    take: 25,
  });

  async function SyncButton() {
    // client-less progressive enhancement: server action via route
    return (
      <form action="/api/sync/run" method="post">
        <button className="border rounded px-3 py-2">
          Sync Google birthdays
        </button>
      </form>
    );
  }

  return (
    <main className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <SyncButton />
      </div>

      <section className="space-y-2">
        <h2 className="font-medium">Upcoming Special Days</h2>
        <ul className="divide-y">
          {days.length === 0 && (
            <li className="py-2 text-sm text-gray-500">
              No days yet. Try syncing.
            </li>
          )}
          {days.map((d) => (
            <li key={d.id} className="py-2 flex justify-between">
              <span>{d.title}</span>
              <span>{new Date(d.date).toDateString()}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
