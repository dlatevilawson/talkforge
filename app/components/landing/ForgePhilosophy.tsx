"use client";

const pillars = [
  { title: "Practice", body: "Reps before the real moment." },
  { title: "Reflection", body: "Hear how your words land." },
  { title: "Growth", body: "Improve from what you actually said." },
  { title: "Confidence", body: "Walk in prepared — not hoping." },
] as const;

/** Chapter Two — philosophy revealed through motion, not feature cards. */
export default function ForgePhilosophy() {
  return (
    <div className="mx-auto mt-20 grid max-w-4xl gap-16 sm:grid-cols-2">
      {pillars.map((pillar, index) => (
        <div
          key={pillar.title}
          className="lp-philosophy-item"
          style={{ animationDelay: `${index * 120}ms` }}
        >
          <p className="font-[family-name:var(--font-lp-display)] text-5xl font-medium tracking-[-0.04em] text-[var(--lp-ink)] sm:text-6xl">
            {pillar.title}
          </p>
          <p className="mt-4 max-w-xs text-lg leading-8 text-[var(--lp-muted)]">
            {pillar.body}
          </p>
        </div>
      ))}
    </div>
  );
}
