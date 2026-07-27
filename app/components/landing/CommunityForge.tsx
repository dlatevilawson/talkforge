"use client";

import { useMemo } from "react";

/** Belonging visual — lights as people choosing to practice. No fabricated live counts. */
export default function CommunityForge() {
  const lights = useMemo(() => {
    const seed = 42;
    const out: { left: string; top: string; delay: string; size: string }[] = [];
    let s = seed;
    for (let i = 0; i < 80; i++) {
      s = (s * 16807) % 2147483647;
      const x = (s % 1000) / 10;
      s = (s * 16807) % 2147483647;
      const y = (s % 1000) / 10;
      s = (s * 16807) % 2147483647;
      const delay = ((s % 6000) / 1000).toFixed(2);
      s = (s * 16807) % 2147483647;
      const size = 2 + (s % 4);
      out.push({
        left: `${x}%`,
        top: `${y}%`,
        delay: `${delay}s`,
        size: `${size}px`,
      });
    }
    return out;
  }, []);

  return (
    <div className="lp-community relative mx-auto mt-16 h-56 w-full max-w-4xl overflow-hidden sm:h-72">
      <div className="absolute inset-0" aria-hidden>
        {lights.map((light, i) => (
          <span
            key={i}
            className="lp-community-light absolute rounded-full bg-[var(--lp-ink)]"
            style={{
              left: light.left,
              top: light.top,
              width: light.size,
              height: light.size,
              animationDelay: light.delay,
            }}
          />
        ))}
      </div>
      <div className="relative flex h-full items-end justify-center pb-2">
        <p className="max-w-md text-center font-[family-name:var(--font-lp-display)] text-xl font-medium tracking-[-0.02em] text-[var(--lp-ink)] sm:text-2xl">
          Every light is someone choosing to practice.
        </p>
      </div>
    </div>
  );
}
