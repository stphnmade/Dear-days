"use client";
import React from "react";

type IconSpec = {
  use: string;
  color: string;
  size: number | string; // px or clamp()
  left: string;
  top: string;
  delay?: number;
};

export default function OccasionIconsBg() {
  // Bigger sizes + slightly higher opacity handled via CSS class
  const icons: IconSpec[] = [
    {
      use: "#i-balloon",
      color: "#f9a8d4",
      size: "clamp(72px, 9vw, 128px)",
      left: "6%",
      top: "68%",
      delay: 0,
    },
    {
      use: "#i-gift",
      color: "#fde68a",
      size: "clamp(78px, 10vw, 140px)",
      left: "78%",
      top: "62%",
      delay: -2,
    },
    {
      use: "#i-rings",
      color: "#e9d5ff",
      size: "clamp(68px, 8vw, 120px)",
      left: "12%",
      top: "16%",
      delay: -4,
    },
    {
      use: "#i-cake",
      color: "#ffd6a5",
      size: "clamp(84px, 11vw, 150px)",
      left: "86%",
      top: "16%",
      delay: -6,
    },
    {
      use: "#i-calendar",
      color: "#bae6fd",
      size: "clamp(76px, 9vw, 132px)",
      left: "48%",
      top: "76%",
      delay: -1,
    },
    {
      use: "#i-balloon",
      color: "#bbf7d0",
      size: "clamp(64px, 8vw, 116px)",
      left: "34%",
      top: "12%",
      delay: -3,
    },
    {
      use: "#i-gift",
      color: "#fbcfe8",
      size: "clamp(70px, 9vw, 124px)",
      left: "58%",
      top: "8%",
      delay: -5,
    },
  ];

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
    >
      {/* VERY light vignette so content pops but nothing is washed out */}
      <div
        className="absolute inset-0
          bg-[radial-gradient(70%_55%_at_50%_25%,rgba(255,255,255,.12),transparent_85%)]
          dark:bg-[radial-gradient(70%_55%_at_50%_25%,rgba(0,0,0,.10),transparent_85%)]"
      />

      {/* sprite sheet (defs only) */}
      <svg width="0" height="0" className="absolute">
        <defs>
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
        </defs>
      </svg>

      {/* place icons */}
      {icons.map((it, i) => (
        <svg
          key={i}
          viewBox="0 0 64 64"
          style={
            {
              color: it.color,
              width: typeof it.size === "number" ? `${it.size}px` : it.size,
              height: typeof it.size === "number" ? `${it.size}px` : it.size,
              left: it.left,
              top: it.top,
              ["--delay" as any]: `${it.delay ?? 0}s`,
            } as React.CSSProperties
          }
          className="absolute dd-icon animate-dd-float"
        >
          <use href={it.use} />
        </svg>
      ))}
    </div>
  );
}
