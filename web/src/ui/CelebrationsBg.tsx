"use client";

import React from "react";

/**
 * Decorative full-screen background with subtle animated celebration icons.
 * - SVG symbols are lightweight and reused via <use>.
 * - Animations pause for users who prefer reduced motion.
 * - pointer-events: none so it never blocks clicks.
 */
export default function CelebrationsBg() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
    >
      {/* soft radial gradient wash */}
      <div className="absolute inset-0 bg-[radial-gradient(60%_50%_at_50%_30%,var(--bgGlow1),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(40%_30%_at_20%_80%,var(--bgGlow2),transparent_70%)]" />

      {/* sprite sheet (0×0 keeps defs only) */}
      <svg width="0" height="0" className="absolute">
        <defs>
          {/* Balloon */}
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

          {/* Rings */}
          <symbol id="i-rings" viewBox="0 0 64 64">
            <circle
              cx="24"
              cy="36"
              r="16"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
            />
            <circle
              cx="40"
              cy="28"
              r="16"
              stroke="currentColor"
              strokeWidth="6"
              fill="none"
            />
            <path d="M38 9 L46 5 L50 13" fill="currentColor" />
          </symbol>

          {/* Cake */}
          <symbol id="i-cake" viewBox="0 0 64 64">
            <rect
              x="8"
              y="28"
              width="48"
              height="22"
              rx="6"
              fill="currentColor"
            />
            <path
              d="M8 36 C14 32, 20 40, 26 36 C32 32, 38 40, 44 36 C50 32, 56 40, 56 36"
              fill="#fff"
              opacity="0.7"
            />
            <rect
              x="16"
              y="16"
              width="32"
              height="14"
              rx="6"
              fill="currentColor"
            />
            <path
              d="M24 10 v6 M32 10 v6 M40 10 v6"
              stroke="currentColor"
              strokeWidth="3"
            />
            <circle cx="24" cy="9" r="2" fill="#FFBD2E" />
            <circle cx="32" cy="9" r="2" fill="#FFBD2E" />
            <circle cx="40" cy="9" r="2" fill="#FFBD2E" />
          </symbol>

          {/* Gift */}
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
              y="24"
              width="48"
              height="10"
              fill="#fff"
              opacity="0.7"
            />
            <rect
              x="30"
              y="24"
              width="4"
              height="32"
              fill="#fff"
              opacity="0.7"
            />
            <path
              d="M20 22 C17 14, 27 14, 24 22 M44 22 C47 14, 37 14, 40 22"
              stroke="currentColor"
              strokeWidth="3"
              fill="none"
            />
          </symbol>

          {/* Calendar with heart */}
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
              opacity="0.7"
            />
            <rect
              x="18"
              y="8"
              width="4"
              height="10"
              rx="2"
              fill="#fff"
              opacity="0.9"
            />
            <rect
              x="42"
              y="8"
              width="4"
              height="10"
              rx="2"
              fill="#fff"
              opacity="0.9"
            />
            <path
              d="M32 40
                     c-6 -6 -14 2 -6 8
                     c4 3 6 5 6 5
                     s2 -2 6 -5
                     c8 -6 0 -14 -6 -8z"
              fill="#fff"
              opacity="0.9"
            />
          </symbol>
        </defs>
      </svg>

      {/* floating instances (use brand-ish, readable colors) */}
      <Icon
        use="#i-balloon"
        color="var(--cBalloon)"
        size={64}
        left="8%"
        top="72%"
        delay={0}
      />
      <Icon
        use="#i-gift"
        color="var(--cGift)"
        size={68}
        left="78%"
        top="66%"
        delay={-2}
      />
      <Icon
        use="#i-rings"
        color="var(--cRings)"
        size={60}
        left="12%"
        top="18%"
        delay={-4}
      />
      <Icon
        use="#i-cake"
        color="var(--cCake)"
        size={72}
        left="86%"
        top="18%"
        delay={-6}
      />
      <Icon
        use="#i-calendar"
        color="var(--cCalendar)"
        size={70}
        left="48%"
        top="80%"
        delay={-1}
      />
      <Icon
        use="#i-balloon"
        color="var(--cBalloon2)"
        size={54}
        left="34%"
        top="14%"
        delay={-3}
      />
      <Icon
        use="#i-gift"
        color="var(--cGift2)"
        size={58}
        left="58%"
        top="8%"
        delay={-5}
      />
    </div>
  );
}

function Icon({
  use,
  color,
  size,
  left,
  top,
  delay = 0,
}: {
  use: string;
  color: string;
  size: number;
  left: string;
  top: string;
  delay?: number;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      style={
        {
          color,
          width: size,
          height: size,
          left,
          top,
          // individual drift timing
          ["--delay" as any]: `${delay}s`,
        } as React.CSSProperties
      }
      className="absolute opacity-[0.12] md:opacity-[0.18] animate-float"
    >
      <use href={use} />
    </svg>
  );
}
