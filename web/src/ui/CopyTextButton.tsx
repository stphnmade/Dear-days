"use client";

import { useState } from "react";

export default function CopyTextButton({
  text,
  label = "Copy",
}: {
  text: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function onCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={onCopy}
      className="rounded-lg px-3 py-2 text-sm dd-btn-neutral hover:opacity-90"
    >
      {copied ? "Copied" : label}
    </button>
  );
}
