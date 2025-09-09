// src/ui/SubmitButton.tsx
"use client";
import { useFormStatus } from "react-dom";
export default function SubmitButton({
  children,
  theme = "default",
}: {
  children: React.ReactNode;
  theme?: "default" | "danger";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      disabled={pending}
      className={`rounded-xl px-3 py-1.5 text-sm ${
        theme === "danger"
          ? "bg-rose-600 text-white disabled:bg-rose-400"
          : "bg-slate-900 text-white dark:bg-white dark:text-slate-900 disabled:opacity-60"
      }`}
    >
      {pending ? "Saving..." : children}
    </button>
  );
}
