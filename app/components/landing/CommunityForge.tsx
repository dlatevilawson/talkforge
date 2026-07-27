"use client";

import { useMemo, useState } from "react";
import Reveal from "@/app/components/landing/Reveal";

const STORIES = [
  "Preparing for an interview",
  "Learning to become a better father",
  "Saving a marriage",
  "Practicing wedding vows",
  "Becoming a leader",
  "Finding words for an apology",
  "Preparing difficult feedback",
  "Walking into a new school ready",
] as const;

type Light = {
  left: string;
  top: string;
  delay: string;
  size: string;
  story: string;
};

/** Belonging — living constellation. “I belong here.” */
export default function CommunityForge() {
  const [active, setActive] = useState<number | null>(null);

  const lights = useMemo(() => {
    const out: Light[] = [];
    let s = 91;
    for (let i = 0; i < 72; i++) {
      s = (s * 16807) % 2147483647;
      const x = 6 + (s % 880) / 10;
      s = (s * 16807) % 2147483647;
      const y = 8 + (s % 820) / 10;
      s = (s * 16807) % 2147483647;
      const delay = ((s % 8000) / 1000).toFixed(2);
      s = (s * 16807) % 2147483647;
      const size = 2 + (s % 5);
      out.push({
        left: `${x}%`,
        top: `${y}%`,
        delay: `${delay}s`,
        size: `${size}px`,
        story: STORIES[i % STORIES.length],
      });
    }
    return out;
  }, []);

  return (
    <section
      id="community"
      className="lp-light-chapter scroll-mt-20 bg-black px-5 py-32 text-white sm:px-8 sm:py-40"
    >
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-gold)]/70">
            Belonging
          </p>
          <h2 className="mt-6 font-[family-name:var(--font-lp-display)] text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            You belong here.
          </h2>
        </Reveal>
      </div>

      <Reveal delayMs={100}>
        <div className="lp-constellation relative mx-auto mt-20 h-80 w-full max-w-4xl sm:h-[28rem]">
          {lights.map((light, i) => (
            <button
              key={i}
              type="button"
              className="lp-community-light absolute rounded-full bg-white"
              style={{
                left: light.left,
                top: light.top,
                width: light.size,
                height: light.size,
                animationDelay: light.delay,
              }}
              aria-label={light.story}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => setActive(i)}
              onBlur={() => setActive(null)}
            />
          ))}

          <div
            className={`pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4 transition-all duration-500 ${
              active !== null ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
            }`}
            aria-live="polite"
          >
            <p className="rounded-full border border-[var(--lp-gold)]/25 bg-black/60 px-5 py-2.5 text-sm text-white/90 backdrop-blur-sm">
              {active !== null ? lights[active].story : ""}
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
