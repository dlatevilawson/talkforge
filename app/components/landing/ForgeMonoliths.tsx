"use client";

import Reveal from "@/app/components/landing/Reveal";

const pillars = [
  { id: "practice", label: "Practice" },
  { id: "reflection", label: "Reflection" },
  { id: "growth", label: "Growth" },
  { id: "confidence", label: "Confidence" },
] as const;

/** Priority 6 — museum artifacts. Explore, don’t skim. */
export default function ForgeMonoliths() {
  return (
    <section
      id="forge"
      className="scroll-mt-20 bg-[var(--lp-finale)] px-5 py-32 text-white sm:px-8 sm:py-40"
    >
      <div className="mx-auto max-w-5xl text-center">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">
            The Forge
          </p>
          <h2 className="mt-6 font-[family-name:var(--font-lp-display)] text-4xl font-semibold tracking-[-0.04em] sm:text-6xl">
            Four principles.
            <br />
            One path upward.
          </h2>
        </Reveal>
      </div>

      <div className="mx-auto mt-24 grid max-w-5xl grid-cols-2 gap-5 sm:mt-32 sm:grid-cols-4 sm:gap-8">
        {pillars.map((pillar, index) => (
          <Reveal key={pillar.id} delayMs={index * 140}>
            <figure className="lp-monolith group flex flex-col items-center">
              <div
                className="lp-monolith-body relative w-full max-w-[9rem] overflow-hidden rounded-sm"
                style={{ height: `${14 + index * 1.5}rem` }}
              >
                <div className="lp-monolith-light absolute inset-0" />
              </div>
              <figcaption className="mt-8 text-xs font-medium uppercase tracking-[0.32em] text-white/55 transition-colors duration-700 group-hover:text-white/90">
                {pillar.label}
              </figcaption>
            </figure>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
