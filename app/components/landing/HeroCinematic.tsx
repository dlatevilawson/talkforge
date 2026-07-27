"use client";

import { useEffect, useState } from "react";
import TalkForgeLogo from "@/app/components/landing/TalkForgeLogo";

/**
 * Priority 1 — cinematic opening.
 * Silence → mark from darkness → headline → invitation.
 * Entering The Forge, not opening a webpage.
 */
export default function HeroCinematic() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPhase(4);
      return;
    }

    const timers = [
      window.setTimeout(() => setPhase(1), 400), // ambient
      window.setTimeout(() => setPhase(2), 1400), // mark
      window.setTimeout(() => setPhase(3), 3200), // headline
      window.setTimeout(() => setPhase(4), 4200), // CTA
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <section
      className="lp-hero-cinematic relative flex min-h-[100dvh] flex-col items-center justify-center overflow-hidden bg-black px-5 pb-20 pt-24 sm:px-8"
      data-phase={phase}
      aria-label="Enter TalkForge"
      style={{ backgroundColor: "#000000" }}
    >
      <div
        className="lp-hero-void pointer-events-none absolute inset-0 bg-black"
        aria-hidden
      />
      <div className="lp-hero-ambient pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center text-center">
        <div
          className={`lp-hero-mark-stage transition-all duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            phase >= 2
              ? "translate-y-0 scale-100 opacity-100"
              : "translate-y-4 scale-95 opacity-0"
          }`}
        >
          <TalkForgeLogo variant="sacred" className="text-white" />
        </div>

        <div
          className={`mt-16 transition-all duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:mt-20 ${
            phase >= 3
              ? "translate-y-0 opacity-100"
              : "translate-y-6 opacity-0"
          }`}
        >
          <h1 className="font-[family-name:var(--font-lp-display)] text-[2.6rem] font-semibold leading-[1.06] tracking-[-0.045em] text-white sm:text-6xl md:text-[4.75rem]">
            Communication changes lives.
            <br />
            Master yours.
          </h1>
          <p className="mx-auto mt-8 max-w-md text-base leading-8 text-white/60 sm:text-lg sm:leading-9">
            Nobody is born a great communicator.
            <br />
            Every great communicator is forged.
          </p>
        </div>

        <div
          className={`mt-12 transition-all duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            phase >= 4
              ? "translate-y-0 opacity-100"
              : "translate-y-4 opacity-0"
          }`}
        >
          <a
            href="#stories"
            className="inline-flex min-h-12 min-w-[14rem] items-center justify-center rounded-full bg-white px-8 text-sm font-semibold tracking-wide text-[var(--lp-finale)] transition hover:bg-white/90"
          >
            Enter the Forge
          </a>
        </div>
      </div>
    </section>
  );
}
