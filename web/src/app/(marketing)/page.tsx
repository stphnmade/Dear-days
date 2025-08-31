"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import Link from "next/link";

export default function Marketing() {
  const { status } = useSession();

  return (
    <main className="min-h-screen grid place-items-center bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="w-full max-w-2xl text-center px-6 py-20">
        <h1 className="text-5xl font-extrabold tracking-tight">Dear Days</h1>
        <p className="mt-4 text-lg text-slate-700 dark:text-slate-300">
          Sync birthdays & anniversaries across your family’s calendars. Simple,
          private, and fast.
        </p>

        <div className="mt-8 flex justify-center gap-3">
          {status === "authenticated" ? (
            <>
              <Link
                href="/dashboard"
                className="inline-flex items-center rounded-xl px-4 py-2 bg-sky-600 text-white font-medium hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                Go to dashboard
              </Link>
              <button
                onClick={() => signOut()}
                className="inline-flex items-center rounded-xl px-4 py-2 border border-slate-300 text-slate-900 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-600 dark:text-slate-50 dark:hover:bg-slate-800"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => signIn("google")}
                className="inline-flex items-center rounded-xl px-4 py-2 bg-sky-600 text-white font-medium hover:bg-sky-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
              >
                Sign in with Google
              </button>
              <Link
                href="/api/auth/signin"
                className="inline-flex items-center rounded-xl px-4 py-2 border border-slate-300 text-slate-900 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 dark:border-slate-600 dark:text-slate-50 dark:hover:bg-slate-800"
              >
                Other providers
              </Link>
            </>
          )}
        </div>

        <div className="mt-8 text-xs text-slate-500 dark:text-slate-400">
          Alpha build
        </div>
      </div>
    </main>
  );
}
