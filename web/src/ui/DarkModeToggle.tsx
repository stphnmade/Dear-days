"use client";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

export default function DarkModeToggle() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  const current = theme === "system" ? systemTheme : theme;
  const isDark = current === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="inline-flex items-center gap-2 rounded-xl px-3 py-2
                 border border-slate-300/70 dark:border-slate-600/60
                 bg-white/70 dark:bg-slate-900/60 backdrop-blur
                 hover:bg-white/90 dark:hover:bg-slate-900/80
                 text-slate-700 dark:text-slate-200"
      aria-label="Toggle dark mode"
      title="Toggle dark mode"
    >
      {isDark ? (
        // moon
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M21 12.79A9 9 0 1 1 11.21 3a7 7 0 1 0 9.79 9.79z" />
        </svg>
      ) : (
        // sun
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="currentColor"
          aria-hidden
        >
          <path d="M6.76 4.84l-1.8-1.79L3.17 4.84l1.79 1.79 1.8-1.79zM1 13h3v-2H1v2zm10 10h2v-3h-2v3zM4.22 19.78l1.79 1.79 1.79-1.79-1.79-1.79-1.79 1.79zM20 13h3v-2h-3v2zM17.24 4.84l1.8-1.79 1.79 1.79-1.79 1.79-1.8-1.79zM12 5a7 7 0 100 14 7 7 0 000-14zm7.78 14.78l-1.79-1.79-1.79 1.79 1.79 1.79 1.79-1.79z" />
        </svg>
      )}
      <span className="text-sm">{isDark ? "Dark" : "Light"}</span>
    </button>
  );
}
