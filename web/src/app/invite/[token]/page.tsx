// src/app/invite/[token]/page.tsx
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

export default async function AcceptInvitePage({
  params,
}: {
  params: { token: string };
}) {
  // Must be signed in
  const session = await getAuthSession();
  if (!session?.user) redirect("/");

  const sessionId = (session.user as any).id as string | undefined;
  const sessionEmail = (session.user as any).email as string | undefined;

  // 1) Load invite (must exist, be pending, not expired, and be tied to a family)
  const invite = await prisma.invitation.findUnique({
    where: { token: params.token },
    select: { id: true, status: true, expiresAt: true, familyId: true },
  });

  if (
    !invite ||
    invite.status !== "pending" ||
    invite.expiresAt < new Date() ||
    !invite.familyId
  ) {
    return (
      <main className="mx-auto max-w-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-semibold">Invite</h1>
          <a
            href="/dashboard"
            className="rounded-xl px-3 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900"
          >
            Back to Dashboard
          </a>
        </div>
        <p className="mt-2 text-red-600">
          {!invite
            ? "Invite not found."
            : invite.status !== "pending"
            ? `Invite already ${invite.status}.`
            : invite.expiresAt < new Date()
            ? "Invite has expired."
            : !invite.familyId
            ? "Invite has no family."
            : "This invite is invalid or expired."}
        </p>
      </main>
    );
  }

  // 2) Ensure the family exists (prevents FK failures)
  const family = await prisma.family.findUnique({
    where: { id: invite.familyId },
    select: { id: true },
  });
  if (!family) {
    await prisma.invitation.update({
      where: { id: invite.id },
      data: { status: "invalid" },
    });
    return (
      <main className="mx-auto max-w-2xl p-6">
        <h1 className="text-2xl font-semibold">Invite</h1>
        <p className="mt-2">This invite points to a deleted family.</p>
      </main>
    );
  }

  // 3) Resolve the current user robustly:
  //    - try by session id
  //    - fall back to session email
  //    - if still not found but we have email, upsert by email
  let me =
    (sessionId &&
      (await prisma.user.findUnique({
        where: { id: sessionId },
        select: { id: true, name: true, email: true },
      }))) ||
    (sessionEmail &&
      (await prisma.user.findUnique({
        where: { email: sessionEmail },
        select: { id: true, name: true, email: true },
      }))) ||
    null;

  if (!me && sessionEmail) {
    // Create the user row if provider/session gave us an email but no DB row exists
    me = await prisma.user.upsert({
      where: { email: sessionEmail },
      update: {},
      create: {
        email: sessionEmail,
        name: session.user.name ?? null,
        image: session.user.image ?? null,
      },
      select: { id: true, name: true, email: true },
    });
  }

  // Fallback: create a minimal user with just session id if we still have nothing
  if (!me && sessionId) {
    me = await prisma.user
      .create({
        data: { id: sessionId },
        select: { id: true, name: true, email: true },
      })
      .catch(() => null); // ignore if user already exists

    if (!me) {
      me = await prisma.user.findUnique({
        where: { id: sessionId },
        select: { id: true, name: true, email: true },
      });
    }
  }

  if (!me) {
    // If we get here, the session lacks both a DB id and an email.
    throw new Error("Your account could not be found.");
  }

  // 4) Idempotently join the family.
  // Prefer composite unique if you have: @@unique([familyId, joinedUserId])
  try {
    await prisma.familyMember.upsert({
      where: {
        familyId_joinedUserId: { familyId: family.id, joinedUserId: me.id },
      } as any,
      create: {
        name: me.name ?? "",
        // Use nested connect to satisfy FKs explicitly
        family: { connect: { id: family.id } },
        user: { connect: { id: me.id } }, // maps to joinedUserId via your relation
      },
      update: {},
    });
  } catch {
    // Fallback if the composite alias isn't in your generated client for any reason
    const existing = await prisma.familyMember.findFirst({
      where: { familyId: family.id, joinedUserId: me.id },
      select: { id: true },
    });
    if (!existing) {
      await prisma.familyMember.create({
        data: {
          name: me.name ?? "",
          family: { connect: { id: family.id } },
          user: { connect: { id: me.id } },
        },
      });
    }
  }

  // 5) Mark invite accepted
  await prisma.invitation.update({
    where: { id: invite.id },
    data: { status: "accepted" },
  });

  // Show success message before redirecting
  return (
    <main className="mx-auto max-w-2xl p-6">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-semibold">Invite</h1>
        <a
          href="/dashboard"
          className="rounded-xl px-3 py-2 bg-slate-900 text-white dark:bg-white dark:text-slate-900"
        >
          Back to Dashboard
        </a>
      </div>
      <p className="mt-2 text-green-600">
        ✅ Successfully joined the family! Redirecting...
      </p>
      <script>{`setTimeout(() => window.location.href = '/family', 1500);`}</script>
    </main>
  );
}
