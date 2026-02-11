"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import OccasionIconsBg from "@/ui/OccasionIconsBg";
import DarkModeToggle from "@/ui/DarkModeToggle";
import GlassCard from "@/ui/GlassCard";

export default function Marketing() {
  const { status } = useSession();

  return (
    <main className="relative grid min-h-screen place-items-center dd-page">
      <OccasionIconsBg />

      <GlassCard>
        <div className="absolute top-4 right-4">
          <DarkModeToggle />
        </div>

        <h1 className="text-5xl font-extrabold tracking-tight text-[var(--dd-accent-blue)] md:text-6xl">
          Dear Days
        </h1>

        <p className="mt-6 text-lg dd-text-muted md:text-xl">
          A hub for birthdays, weddings, anniversaries, and every celebration
          synced from your calendars.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {status === "authenticated" ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-xl px-5 py-2.5 font-medium dd-btn-primary hover:opacity-90"
              >
                Go to dashboard
              </Link>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center rounded-xl px-5 py-2.5 font-medium dd-btn-danger hover:opacity-90"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => signIn("google")}
                className="inline-flex items-center rounded-xl px-5 py-2.5 font-medium dd-btn-primary hover:opacity-90"
              >
                Sign in with Google
              </button>
              <Link
                href="/api/auth/signin"
                className="inline-flex items-center rounded-xl px-5 py-2.5 font-medium dd-btn-neutral"
              >
                Other providers
              </Link>
            </>
          )}
        </div>
      </GlassCard>
    </main>
  );
}
