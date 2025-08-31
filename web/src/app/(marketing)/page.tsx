"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";
import PastelBlobsBg from "@/ui/PastelBlobsBg";
import OccasionIconsBg from "@/ui/OccasionIconsBg";

export default function Marketing() {
  const { status } = useSession();

  return (
    <main className="relative min-h-screen grid place-items-center">
      <OccasionIconsBg />
      {/* Glass card */}
      <div
        className="relative w-full max-w-3xl px-8 py-16 text-center rounded-3xl border
                      border-white/60 dark:border-black/50 bg-white/70 
                      backdrop-blur-xl shadow-lg"
      >
        <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight">
          <span className="bg-gradient-to-r from-rose-500 via-pink-500 to-violet-500 bg-clip-text text-transparent">
            Dear Days
          </span>
        </h1>

        <p className="mt-6 text-lg md:text-xl text-slate-700/90 dark:text-slate-900">
          A hub for birthdays, weddings, anniversaries, and every celebration
          synced from your calendars.
        </p>

        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          {status === "authenticated" ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-xl px-5 py-2.5 text-white font-medium
             bg-gradient-to-r from-rose-400 via-pink-400 to-violet-400
             hover:from-rose-500 hover:via-pink-500 hover:to-violet-500
             focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70 shadow-md"
              >
                Go to dashboard
              </Link>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center rounded-xl px-5 py-2.5 font-medium
                           border border-rose-200/70 dark:border-white/10
                           text-rose-700 hover:bg-rose-50
                           dark:text-rose-200 dark:hover:bg-white/5"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => signIn("google")}
                className="inline-flex items-center rounded-xl px-5 py-2.5 text-white font-medium
                           bg-gradient-to-r from-rose-400 via-pink-400 to-violet-400
                           hover:from-rose-500 hover:via-pink-500 hover:to-violet-500
                           focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400/70 shadow-md"
              >
                Sign in with Google
              </button>
              <Link
                href="/api/auth/signin"
                className="inline-flex items-center rounded-xl px-5 py-2.5 font-medium
                           border border-fuchsia-200/70 dark:border-white/10
                           text-fuchsia-700 hover:bg-fuchsia-50
                           dark:text-fuchsia-200 dark:hover:bg-white/5"
              >
                Other providers
              </Link>
            </>
          )}
        </div>

        <div className="mt-8 text-xs text-slate-500 dark:text-slate-400">
          Alpha build · Pastel theme
        </div>
      </div>
    </main>
  );
}
