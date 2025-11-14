"use client";

import { useEffect, useState } from "react";

type Accent = "rose" | "violet" | "sky" | "emerald" | "amber" | "slate";
type Props = {
  children: React.ReactNode;
  className?: string;
  accent?: Accent; // subtle colored ring+glow
  noAccent?: boolean;
};
type Size = "default" | "compact";

const ACCENT: Record<Accent, string> = {
  rose: "ring-1 ring-rose-300/50 dark:ring-rose-400/25 shadow-[0_12px_48px_-16px_rgba(244,114,182,0.22)]",
  violet:
    "ring-1 ring-violet-300/50 dark:ring-violet-400/25 shadow-[0_12px_48px_-16px_rgba(139,92,246,0.22)]",
  sky: "ring-1 ring-sky-300/50 dark:ring-sky-400/25 shadow-[0_12px_48px_-16px_rgba(56,189,248,0.22)]",
  emerald:
    "ring-1 ring-emerald-300/50 dark:ring-emerald-400/25 shadow-[0_12px_48px_-16px_rgba(16,185,129,0.22)]",
  amber:
    "ring-1 ring-amber-300/50 dark:ring-amber-400/25 shadow-[0_12px_48px_-16px_rgba(245,158,11,0.22)]",
  slate:
    "ring-1 ring-slate-300/50 dark:ring-slate-600/25 shadow-[0_12px_48px_-16px_rgba(2,6,23,0.22)]",
};

export default function GlassCard({
  children,
  className = "",
  accent = "rose",
  noAccent = false,
  size = "default",
}: Props & { size?: Size }) {
  const [hasBackdrop, setHasBackdrop] = useState(false);

  useEffect(() => {
    const ok =
      typeof CSS !== "undefined" &&
      CSS.supports?.("backdrop-filter: blur(8px)");
    setHasBackdrop(!!ok);
  }, []);

  // Softer surface: a bit less white, dim brightness slightly, boost saturation a touch
  const surface = hasBackdrop
    ? "bg-white/55 dark:bg-slate-900/50 backdrop-blur-xl backdrop-brightness-90 backdrop-saturate-110"
    : "bg-white/95 dark:bg-slate-900/95"; // fallback if no backdrop support

  const frame =
    "rounded-3xl border border-white/40 dark:border-white/10 overflow-hidden";
  const pad =
    size === "compact" ? "px-4 py-4 text-left" : "px-8 py-16 text-center";
  const accentClasses = noAccent ? "" : ACCENT[accent];

  return (
    <div
      className={[
        "relative w-full max-w-3xl",
        surface,
        frame,
        accentClasses,
        pad,
        className,
      ].join(" ")}
    >
      {/* ambient overlay (super subtle) */}
      <div className="pointer-events-none absolute inset-0 dd-ambient opacity-30 dark:opacity-25" />
      {/* content sits above */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
