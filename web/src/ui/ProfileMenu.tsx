"use client";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { signOut } from "next-auth/react";
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
        className="flex items-center gap-2 rounded-full border px-2 py-1 shadow dd-card hover:opacity-90"
        aria-label="Open profile menu"
      >
        {avatar ? (
          <Image
            src={avatar}
            alt={name ?? "Profile"}
            width={32}
            height={32}
            className="h-8 w-8 rounded-full"
          />
        ) : (
          <div className="h-8 w-8 rounded-full dd-card-muted" />
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
        <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border shadow-lg dd-card">
          <div className="border-b p-4">
            <div className="font-semibold">{name ?? "Profile"}</div>
          </div>
          <div className="flex flex-col gap-2 p-4">
            <Link
              href="/connections"
              className="rounded px-3 py-2 hover:opacity-90 dd-card-muted"
            >
              Connections
            </Link>
            <DarkModeToggle />
            <Link
              href="/settings"
              className="rounded px-3 py-2 hover:opacity-90 dd-card-muted"
            >
              Settings
            </Link>
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: "/" })}
              className="w-full rounded px-3 py-2 text-left dd-btn-danger"
            >
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
