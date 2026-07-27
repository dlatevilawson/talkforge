"use client";

import { useEffect, useRef, useState } from "react";
import TalkForgeLogo from "@/app/components/landing/TalkForgeLogo";
import WaitlistForm from "@/app/components/landing/WaitlistForm";

/**
 * End with identity — not a form.
 * Symbol → darkness → one sentence → pause → Begin the Forge.
 */
export default function FinaleIdentity() {
  const ref = useRef<HTMLElement>(null);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timers: number[] = [];

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        if (reduced) {
          setPhase(4);
          return;
        }
        timers = [
          window.setTimeout(() => setPhase(1), 200),
          window.setTimeout(() => setPhase(2), 1600),
          window.setTimeout(() => setPhase(3), 3800),
          window.setTimeout(() => setPhase(4), 5200),
        ];
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <section
      ref={ref}
      id="begin"
      className="lp-finale relative flex min-h-[100dvh] scroll-mt-0 items-center justify-center overflow-hidden bg-black px-5 py-32 text-white sm:px-8"
    >
      <div className="lp-finale-ember pointer-events-none absolute inset-0" aria-hidden />

      <div className="relative z-10 mx-auto flex max-w-3xl flex-col items-center text-center">
        <div
          className={`transition-all duration-[1800ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            phase >= 1
              ? "scale-100 opacity-100"
              : "scale-95 opacity-0"
          } ${phase >= 2 ? "opacity-40" : ""} ${phase >= 3 ? "opacity-0" : ""}`}
        >
          <TalkForgeLogo variant="finale" className="text-white" />
        </div>

        <h2
          className={`mt-10 font-[family-name:var(--font-lp-display)] text-3xl font-semibold leading-[1.2] tracking-[-0.035em] transition-all duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:text-5xl ${
            phase >= 2
              ? "translate-y-0 opacity-100"
              : "translate-y-6 opacity-0"
          }`}
        >
          The conversations that shape your life
          <br />
          deserve more than hope.
        </h2>

        <div
          className={`mt-14 w-full max-w-md transition-all duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
            phase >= 4
              ? "translate-y-0 opacity-100"
              : "pointer-events-none translate-y-4 opacity-0"
          }`}
        >
          <WaitlistForm ctaLabel="Begin the Forge" tone="dark" />
        </div>
      </div>
    </section>
  );
}
