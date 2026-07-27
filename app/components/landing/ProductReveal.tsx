"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Reveal from "@/app/components/landing/Reveal";

const STEPS = [
  "You speak.",
  "A waveform appears.",
  "Forge listens.",
  "Insight emerges.",
  "Confidence grows.",
] as const;

/**
 * Priority 8 — transformation first; device last.
 * Story never exists to validate the product.
 */
export default function ProductReveal() {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [showDevice, setShowDevice] = useState(false);

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
          setStep(STEPS.length);
          setShowDevice(true);
          return;
        }
        STEPS.forEach((_, i) => {
          timers.push(window.setTimeout(() => setStep(i + 1), 700 + i * 900));
        });
        timers.push(
          window.setTimeout(() => setShowDevice(true), 700 + STEPS.length * 900 + 400)
        );
      },
      { threshold: 0.35 }
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
      id="transformation"
      className="scroll-mt-20 bg-[var(--lp-bg)] px-5 py-32 sm:px-8 sm:py-40"
    >
      <div className="mx-auto max-w-3xl text-center">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
            Confidence
          </p>
          <h2 className="mt-6 font-[family-name:var(--font-lp-display)] text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
            Practice becomes readiness.
          </h2>
        </Reveal>

        <ol className="mx-auto mt-16 max-w-md space-y-5 text-left">
          {STEPS.map((label, index) => {
            const on = step > index;
            return (
              <li
                key={label}
                className={`flex items-center gap-4 transition-all duration-700 ${
                  on ? "translate-x-0 opacity-100" : "translate-x-2 opacity-25"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    on ? "bg-[var(--lp-ink)]" : "bg-[var(--lp-line)]"
                  }`}
                  aria-hidden
                />
                <span className="font-[family-name:var(--font-lp-display)] text-xl tracking-[-0.02em] text-[var(--lp-ink)] sm:text-2xl">
                  {label}
                </span>
              </li>
            );
          })}
        </ol>

        {step >= 2 && (
          <div
            className="lp-waveform mx-auto mt-12 flex h-12 max-w-xs items-end justify-center gap-1"
            aria-hidden
          >
            {Array.from({ length: 22 }).map((_, i) => (
              <span
                key={i}
                className="lp-waveform-bar w-1 rounded-full bg-[var(--lp-ink)]"
                style={{ animationDelay: `${i * 0.07}s` }}
              />
            ))}
          </div>
        )}
      </div>

      <div
        className={`mx-auto mt-20 flex justify-center transition-all duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          showDevice
            ? "translate-y-0 opacity-100"
            : "translate-y-8 opacity-0"
        }`}
      >
        <div className="lp-phone relative w-[200px] sm:w-[230px]">
          <div className="overflow-hidden rounded-[2rem] border border-[var(--lp-line)] bg-[var(--lp-ink)] shadow-[0_40px_80px_-48px_rgba(18,20,23,0.5)]">
            <div className="relative aspect-[9/19] w-full">
              <Image
                src="/landing/chapter-product.jpg"
                alt="TalkForge practice session"
                fill
                className="object-cover opacity-90"
                sizes="230px"
              />
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent px-5 pb-8 pt-16">
                <p className="text-[10px] uppercase tracking-[0.22em] text-white/55">
                  The tool behind the moment
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
