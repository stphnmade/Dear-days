import Link from "next/link";
import { redirect } from "next/navigation";
import { getAuthSession } from "@/lib/auth";
import { prisma } from "@/lib/db";

type InviteStateProps = {
  eyebrow: string;
  title: string;
  message: string;
  tone?: InviteTone;
  primaryHref: string;
  primaryLabel: string;
  secondaryHref?: string;
  secondaryLabel?: string;
};
type InviteTone = "success" | "warning" | "error" | "neutral";

function InviteState({
  eyebrow,
  title,
  message,
  tone = "neutral",
  primaryHref,
  primaryLabel,
  secondaryHref,
  secondaryLabel,
}: InviteStateProps) {
  const toneStyles: Record<InviteTone, string> = {
    success: "dd-card border-[var(--dd-accent-green)]",
    warning: "dd-card-muted",
    error: "dd-card border-[var(--dd-accent-red)]",
    neutral: "dd-card",
  };

  return (
    <main className="mx-auto w-[92%] max-w-3xl py-10 dd-page">
      <section className={`rounded-3xl border p-7 ${toneStyles[tone]}`}>
        <div>
          <p className="text-xs uppercase tracking-[0.18em] dd-text-muted">
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
          <p className="mt-3 text-sm dd-text-muted">{message}</p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={primaryHref}
              className="inline-flex items-center rounded-xl px-4 py-2 text-sm dd-btn-primary hover:opacity-90"
            >
              {primaryLabel}
            </Link>
            {secondaryHref && secondaryLabel ? (
              <Link
                href={secondaryHref}
                className="inline-flex items-center rounded-xl px-4 py-2 text-sm dd-btn-neutral hover:opacity-90"
              >
                {secondaryLabel}
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </main>
  );
}

export default async function AcceptInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  // Must be signed in
  const session = await getAuthSession();
  if (!session?.user) redirect("/");

  const sessionId = session.user.id;
  const sessionEmail = session.user.email ?? undefined;

  // 1) Load invite (must exist, be pending, not expired, and be tied to a family)
  const invite = await prisma.invitation.findUnique({
    where: { token },
    select: { id: true, status: true, expiresAt: true, familyId: true },
  });

  if (
    !invite ||
    invite.status !== "pending" ||
    invite.expiresAt < new Date() ||
    !invite.familyId
  ) {
    const reason = !invite
      ? "Invite not found."
      : invite.status !== "pending"
      ? `Invite already ${invite.status}.`
      : invite.expiresAt < new Date()
      ? "Invite has expired."
      : "Invite is missing a family.";

    return (
      <InviteState
        eyebrow="Invite Status"
        title="This invite is no longer valid"
        message={reason}
        tone="warning"
        primaryHref="/family"
        primaryLabel="Open Family"
        secondaryHref="/dashboard"
        secondaryLabel="Back to Dashboard"
      />
    );
  }

  // 2) Ensure the family exists (prevents FK failures)
  const family = await prisma.family.findUnique({
    where: { id: invite.familyId },
    select: { id: true, name: true },
  });
  if (!family) {
    await prisma.invitation.update({
      where: { id: invite.id },
      data: { status: "invalid" },
    });
    return (
      <InviteState
        eyebrow="Invite Status"
        title="This family no longer exists"
        message="The invite pointed to a deleted family. Ask the owner to create a fresh invite."
        tone="error"
        primaryHref="/family"
        primaryLabel="Open Family"
        secondaryHref="/dashboard"
        secondaryLabel="Back to Dashboard"
      />
    );
  }

  // 3) Resolve the current user robustly:
  //    - try by session id
  //    - fall back to session email
  //    - if still not found but we have email, upsert by email
  let me: { id: string; name: string | null; email: string | null } | null =
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
      },
      create: {
        name: me.name ?? me.email ?? "Member",
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
          name: me.name ?? me.email ?? "Member",
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

  return (
    <InviteState
      eyebrow="Invite Accepted"
      title={`You're now part of ${family.name}`}
      message="Shared events and group updates are now available in your family dashboard."
      tone="success"
      primaryHref={`/family?familyId=${encodeURIComponent(family.id)}`}
      primaryLabel="Go to Group"
      secondaryHref="/dashboard"
      secondaryLabel="Back to Dashboard"
    />
  );
}
