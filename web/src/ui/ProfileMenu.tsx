"use client";
import { useState } from "react";
import Link from "next/link";
import DarkModeToggle from "@/ui/DarkModeToggle";

export default function ProfileMenu({
  avatar,
  name,
}: {
  avatar?: string;
  name?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-full border border-slate-300/70 dark:border-slate-600/60 bg-white/70 dark:bg-slate-900/60 px-2 py-1 shadow hover:bg-white/90 dark:hover:bg-slate-900/80"
        aria-label="Open profile menu"
      >
        {avatar ? (
          <img
            src={avatar}
            alt={name ?? "Profile"}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-rose-300 to-violet-300" />
        )}
        <svg
          width="24"
          height="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
          aria-hidden
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 shadow-lg z-50">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800">
            <div className="font-semibold">{name ?? "Profile"}</div>
          </div>
          <div className="flex flex-col gap-2 p-4">
            <Link
              href="/connections"
              className="rounded px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Connections
            </Link>
            <DarkModeToggle />
            <Link
              href="/settings"
              className="rounded px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Settings
            </Link>
            <form action="/api/auth/signout" method="post">
              <button
                type="submit"
                className="w-full rounded px-3 py-2 text-left hover:bg-rose-50 dark:hover:bg-white/5 text-rose-700 dark:text-rose-200"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
