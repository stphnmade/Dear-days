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
          ? "dd-btn-danger disabled:opacity-60"
          : "dd-btn-primary disabled:opacity-60"
      }`}
    >
      {pending ? "Saving..." : children}
    </button>
  );
}
