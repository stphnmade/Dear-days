"use client";

type Accent = "rose" | "violet" | "sky" | "emerald" | "amber" | "slate";
type Props = {
  children: React.ReactNode;
  className?: string;
  accent?: Accent;
  noAccent?: boolean;
};
type Size = "default" | "compact";

const ACCENT: Record<Accent, string> = {
  rose: "border-[var(--dd-accent-red)]",
  violet: "border-[var(--dd-accent-blue)]",
  sky: "border-[var(--dd-accent-blue)]",
  emerald: "border-[var(--dd-accent-green)]",
  amber: "border-[var(--dd-sand)]",
  slate: "border-[var(--dd-border)]",
};

export default function GlassCard({
  children,
  className = "",
  accent = "rose",
  noAccent = false,
  size = "default",
}: Props & { size?: Size }) {
  const surface = "dd-card";
  const frame = "rounded-3xl border overflow-hidden";
  const pad =
    size === "compact" ? "px-4 py-4 text-left" : "px-8 py-16 text-center";
  const accentClasses = noAccent ? "border-[var(--dd-border)]" : ACCENT[accent];

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
      <div className="relative z-10">{children}</div>
    </div>
  );
}
