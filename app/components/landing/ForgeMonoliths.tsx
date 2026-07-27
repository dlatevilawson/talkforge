"use client";

import { useState } from "react";
import Reveal from "@/app/components/landing/Reveal";

const pillars = [
  {
    id: "practice",
    label: "Practice",
    personality: "worn",
    detail: "Worn smooth by repetition.",
    height: "h-56 sm:h-72",
  },
  {
    id: "reflection",
    label: "Reflection",
    personality: "mirror",
    detail: "A surface that returns what you said.",
    height: "h-60 sm:h-80",
  },
  {
    id: "growth",
    label: "Growth",
    personality: "fracture",
    detail: "Light finds the upward cracks.",
    height: "h-64 sm:h-[22rem]",
  },
  {
    id: "confidence",
    label: "Confidence",
    personality: "tall",
    detail: "The one that stands when it counts.",
    height: "h-72 sm:h-[26rem]",
  },
] as const;

/** The Forge — carved monoliths with personality. Museum, not skim. */
export default function ForgeMonoliths() {
  const [active, setActive] = useState<string | null>(null);

  return (
    <section
      id="forge"
      className="lp-light-chapter scroll-mt-20 bg-black px-5 py-32 text-white sm:px-8 sm:py-40"
    >
      <div className="mx-auto max-w-4xl text-center">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-gold)]/70">
            The Forge
          </p>
          <h2 className="mt-6 font-[family-name:var(--font-lp-display)] text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Four stones.
            <br />
            One path upward.
          </h2>
        </Reveal>
      </div>

      <div className="mx-auto mt-24 flex max-w-5xl flex-wrap items-end justify-center gap-5 sm:mt-32 sm:gap-8">
        {pillars.map((pillar, index) => {
          const isOn = active === pillar.id;
          return (
            <Reveal key={pillar.id} delayMs={index * 120}>
              <button
                type="button"
                className="lp-monolith group flex w-[9.5rem] flex-col items-center text-left sm:w-40"
                onMouseEnter={() => setActive(pillar.id)}
                onMouseLeave={() => setActive(null)}
                onFocus={() => setActive(pillar.id)}
                onBlur={() => setActive(null)}
                aria-pressed={isOn}
              >
                <div
                  className={`lp-monolith-body lp-monolith-${pillar.personality} relative w-full overflow-hidden rounded-sm ${pillar.height}`}
                >
                  <div className="lp-monolith-light absolute inset-0" />
                </div>
                <span className="mt-7 text-xs font-medium uppercase tracking-[0.32em] text-white/55 transition-colors duration-500 group-hover:text-[var(--lp-gold)]">
                  {pillar.label}
                </span>
                <span
                  className={`mt-3 min-h-[2.5rem] text-center text-sm leading-6 text-white/50 transition-opacity duration-500 ${
                    isOn ? "opacity-100" : "opacity-0"
                  }`}
                >
                  {pillar.detail}
                </span>
              </button>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}
