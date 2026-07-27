"use client";

import { useMemo, useState } from "react";
import Reveal from "@/app/components/landing/Reveal";

const STORIES = [
  "Preparing for tomorrow’s interview",
  "Practicing marriage communication",
  "Learning active listening",
  "Leading their first meeting",
  "Rehearsing a hard apology",
  "Finding words for grief",
  "Building confidence to speak up",
  "Preparing feedback for their team",
] as const;

type Light = {
  left: string;
  top: string;
  delay: string;
  size: string;
  story: string;
};

/** Priority 7 — constellation of belonging. You are not practicing alone. */
export default function CommunityForge() {
  const [active, setActive] = useState<number | null>(null);

  const lights = useMemo(() => {
    const out: Light[] = [];
    let s = 42;
    for (let i = 0; i < 56; i++) {
      s = (s * 16807) % 2147483647;
      const x = 8 + (s % 840) / 10;
      s = (s * 16807) % 2147483647;
      const y = 10 + (s % 780) / 10;
      s = (s * 16807) % 2147483647;
      const delay = ((s % 7000) / 1000).toFixed(2);
      s = (s * 16807) % 2147483647;
      const size = 3 + (s % 4);
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
      className="scroll-mt-20 bg-[var(--lp-finale)] px-5 py-32 text-white sm:px-8 sm:py-40"
    >
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-white/45">
            Belonging
          </p>
          <h2 className="mt-6 font-[family-name:var(--font-lp-display)] text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            You are not practicing alone.
          </h2>
        </Reveal>
      </div>

      <Reveal delayMs={120}>
        <div className="lp-constellation relative mx-auto mt-20 h-72 w-full max-w-4xl sm:h-96">
          {lights.map((light, i) => (
            <button
              key={i}
              type="button"
              className="lp-community-light absolute rounded-full bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
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
            className={`pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4 transition-opacity duration-500 ${
              active !== null ? "opacity-100" : "opacity-0"
            }`}
            aria-live="polite"
          >
            <p className="rounded-full border border-white/15 bg-black/50 px-5 py-2 text-sm text-white/85 backdrop-blur-sm">
              {active !== null ? lights[active].story : ""}
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
