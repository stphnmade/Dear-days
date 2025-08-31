"use client";
import React, { useMemo } from "react";

/** tiny deterministic PRNG to avoid hydration mismatch */
function mulberry32(seed: number) {
  return function () {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

type IconId =
  | "#i-balloon"
  | "#i-gift"
  | "#i-rings"
  | "#i-cake"
  | "#i-calendar"
  | "#i-party"
  | "#i-champagne"
  | "#i-bouquet"
  | "#i-heart"
  | "#i-star";

type PaletteKey =
  | "rose"
  | "pink"
  | "violet"
  | "amber"
  | "sky"
  | "mint"
  | "lilac"
  | "peach";

const COLORS: Record<PaletteKey, string> = {
  rose: "#f9a8d4",
  pink: "#fbcfe8",
  violet: "#e9d5ff",
  amber: "#fde68a",
  sky: "#bae6fd",
  mint: "#bbf7d0",
  lilac: "#ddd6fe",
  peach: "#fed7aa",
};

type Spec = {
  id: IconId;
  color: PaletteKey;
  min: number;
  max: number;
  count: number;
};

const SPECS: Spec[] = [
  { id: "#i-balloon", color: "pink", min: 72, max: 140, count: 6 },
  { id: "#i-gift", color: "amber", min: 78, max: 150, count: 5 },
  { id: "#i-rings", color: "violet", min: 68, max: 128, count: 4 },
  { id: "#i-cake", color: "peach", min: 84, max: 160, count: 4 },
  { id: "#i-calendar", color: "sky", min: 76, max: 132, count: 4 },
  { id: "#i-party", color: "rose", min: 64, max: 120, count: 5 },
  { id: "#i-champagne", color: "lilac", min: 64, max: 120, count: 4 },
  { id: "#i-bouquet", color: "mint", min: 68, max: 128, count: 4 },
  { id: "#i-heart", color: "rose", min: 56, max: 110, count: 5 },
  { id: "#i-star", color: "violet", min: 48, max: 96, count: 6 },
];

export default function OccasionIconsBg() {
  // one seed = consistent layout across SSR/CSR
  const seed = 1337;
  const rnd = useMemo(() => mulberry32(seed), []);

  // generate positions/sizes once
  const nodes = useMemo(() => {
    const out: {
      id: IconId;
      size: number;
      left: string;
      top: string;
      color: string;
      delay: number;
    }[] = [];

    // simple jittered grid to avoid overlaps
    const cols = 6;
    const rows = 5;
    const used: { c: number; r: number }[] = [];

    function takeCell() {
      // pick an unused cell
      for (let i = 0; i < 100; i++) {
        const c = Math.floor(rnd() * cols);
        const r = Math.floor(rnd() * rows);
        if (!used.some((u) => u.c === c && u.r === r)) {
          used.push({ c, r });
          // jitter within cell
          const left = (c + 0.1 + rnd() * 0.8) * (100 / cols);
          const top = (r + 0.1 + rnd() * 0.8) * (100 / rows);
          return { left, top };
        }
      }
      // fallback random
      return { left: rnd() * 100, top: rnd() * 100 };
    }

    for (const s of SPECS) {
      for (let i = 0; i < s.count; i++) {
        const { left, top } = takeCell();
        const size = Math.round(s.min + rnd() * (s.max - s.min));
        const delay = Math.round(rnd() * -6 * 10) / 10; // -0..-6s
        out.push({
          id: s.id,
          size,
          left: `${left.toFixed(2)}%`,
          top: `${top.toFixed(2)}%`,
          color: COLORS[s.color],
          delay,
        });
      }
    }
    return out;
  }, [rnd]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* very light vignette so content pops */}
      <div
        className="absolute inset-0
        bg-[radial-gradient(70%_55%_at_50%_25%,rgba(255,255,255,.12),transparent_85%)]
        dark:bg-[radial-gradient(70%_55%_at_50%_25%,rgba(0,0,0,.10),transparent_85%)]"
      />

      {/* sprite sheet */}
      <svg width="0" height="0" className="absolute">
        <defs>
          {/* existing */}
          <symbol id="i-balloon" viewBox="0 0 64 64">
            <ellipse cx="32" cy="24" rx="18" ry="22" fill="currentColor" />
            <path
              d="M28 43 L32 48 L36 43"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
            />
            <path
              d="M32 48 C32 54 27 56 27 61"
              stroke="currentColor"
              strokeWidth="2"
              fill="none"
            />
          </symbol>
          <symbol id="i-rings" viewBox="0 0 64 64">
            <circle
              cx="24"
              cy="36"
              r="16"
              stroke="currentColor"
              strokeWidth="5"
              fill="none"
            />
            <circle
              cx="40"
              cy="28"
              r="16"
              stroke="currentColor"
              strokeWidth="5"
              fill="none"
            />
            <path d="M38 9 L46 5 L50 13" fill="currentColor" />
          </symbol>
          <symbol id="i-cake" viewBox="0 0 64 64">
            <rect
              x="8"
              y="28"
              width="48"
              height="22"
              rx="6"
              fill="currentColor"
            />
            <rect
              x="16"
              y="16"
              width="32"
              height="12"
              rx="6"
              fill="currentColor"
              opacity=".9"
            />
            <path
              d="M24 10 v6 M32 10 v6 M40 10 v6"
              stroke="currentColor"
              strokeWidth="3"
            />
          </symbol>
          <symbol id="i-gift" viewBox="0 0 64 64">
            <rect
              x="8"
              y="24"
              width="48"
              height="32"
              rx="6"
              fill="currentColor"
            />
            <rect
              x="8"
              y="30"
              width="48"
              height="8"
              fill="#fff"
              opacity=".45"
            />
            <rect
              x="30"
              y="24"
              width="4"
              height="32"
              fill="#fff"
              opacity=".45"
            />
          </symbol>
          <symbol id="i-calendar" viewBox="0 0 64 64">
            <rect
              x="8"
              y="12"
              width="48"
              height="42"
              rx="8"
              fill="currentColor"
            />
            <rect
              x="8"
              y="12"
              width="48"
              height="10"
              fill="#fff"
              opacity=".55"
            />
            <path
              d="M32 40 c-6 -6 -14 2 -6 8 c4 3 6 5 6 5 s2 -2 6 -5 c8 -6 0 -14 -6 -8z"
              fill="#fff"
              opacity=".8"
            />
          </symbol>
          {/* new fun ones */}
          <symbol id="i-party" viewBox="0 0 64 64">
            <path d="M6 58 L26 22 L42 38 Z" fill="currentColor" />
            <circle cx="44" cy="18" r="3" fill="currentColor" />
            <circle cx="52" cy="24" r="2.5" fill="currentColor" />
            <circle cx="48" cy="30" r="2" fill="currentColor" />
          </symbol>
          <symbol id="i-champagne" viewBox="0 0 64 64">
            <path d="M24 10 h16 l-3 18 c-1 6-9 6-10 0 z" fill="currentColor" />
            <rect x="29" y="28" width="6" height="18" fill="currentColor" />
          </symbol>
          <symbol id="i-bouquet" viewBox="0 0 64 64">
            <path d="M22 40 L32 18 L42 40 Z" fill="currentColor" />
            <circle cx="32" cy="16" r="6" fill="currentColor" />
          </symbol>
          <symbol id="i-heart" viewBox="0 0 64 64">
            <path
              d="M32 54 s-18-12-18-24 a10 10 0 0 1 18-6 a10 10 0 0 1 18 6 c0 12-18 24-18 24z"
              fill="currentColor"
            />
          </symbol>
          <symbol id="i-star" viewBox="0 0 64 64">
            <path
              d="M32 6 L39 26 L60 26 L42 38 L48 58 L32 46 L16 58 L22 38 L4 26 L25 26 Z"
              fill="currentColor"
            />
          </symbol>
        </defs>
      </svg>

      {/* render */}
      {nodes.map((n, i) => (
        <svg
          key={i}
          viewBox="0 0 64 64"
          style={
            {
              color: n.color,
              width: n.size,
              height: n.size,
              left: n.left,
              top: n.top,
              ["--delay" as any]: `${n.delay}s`,
            } as React.CSSProperties
          }
          className="absolute dd-icon animate-dd-float"
        >
          <use href={n.id} />
        </svg>
      ))}
    </div>
  );
}
