"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Reveal from "@/app/components/landing/Reveal";

type Beat =
  | "idle"
  | "speak"
  | "silence"
  | "wave"
  | "reply"
  | "suggest"
  | "retry"
  | "meter"
  | "device";

/**
 * Reveal a conversation — phone is the consequence.
 */
export default function ProductReveal() {
  const ref = useRef<HTMLElement>(null);
  const [beat, setBeat] = useState<Beat>("idle");

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let timers: number[] = [];

    const run = () => {
      if (reduced) {
        setBeat("device");
        return;
      }
      const sequence: [Beat, number][] = [
        ["speak", 400],
        ["silence", 1600],
        ["wave", 2400],
        ["reply", 3600],
        ["suggest", 4800],
        ["retry", 6000],
        ["meter", 7200],
        ["device", 8600],
      ];
      sequence.forEach(([name, delay]) => {
        timers.push(window.setTimeout(() => setBeat(name), delay));
      });
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        run();
      },
      { threshold: 0.4 }
    );
    observer.observe(node);
    return () => {
      observer.disconnect();
      timers.forEach(clearTimeout);
    };
  }, []);

  const show = (name: Beat) => {
    const order: Beat[] = [
      "speak",
      "silence",
      "wave",
      "reply",
      "suggest",
      "retry",
      "meter",
      "device",
    ];
    return order.indexOf(beat) >= order.indexOf(name);
  };

  return (
    <section
      ref={ref}
      id="transformation"
      className="lp-light-chapter scroll-mt-20 bg-[var(--lp-bg)] px-5 py-32 sm:px-8 sm:py-40"
    >
      <div className="mx-auto max-w-2xl text-center">
        <Reveal>
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
            The moment after practice
          </p>
        </Reveal>

        <div className="mx-auto mt-16 max-w-lg space-y-8 text-left">
          <p
            className={`font-[family-name:var(--font-lp-display)] text-2xl tracking-[-0.02em] transition-all duration-700 sm:text-3xl ${
              show("speak") ? "opacity-100" : "opacity-0"
            }`}
          >
            “I don’t think I’m ready.”
          </p>

          <p
            className={`text-sm uppercase tracking-[0.28em] text-[var(--lp-muted)] transition-opacity duration-700 ${
              beat === "silence" || show("wave") ? "opacity-100" : "opacity-0"
            }`}
          >
            Silence.
          </p>

          {(show("wave") || show("reply")) && (
            <div
              className="lp-waveform flex h-12 items-end gap-1"
              aria-hidden
            >
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  className="lp-waveform-bar w-1 rounded-full bg-[var(--lp-ink)]"
                  style={{ animationDelay: `${i * 0.06}s` }}
                />
              ))}
            </div>
          )}

          <p
            className={`font-[family-name:var(--font-lp-display)] text-xl text-[var(--lp-ink-soft)] transition-all duration-700 sm:text-2xl ${
              show("reply") ? "opacity-100" : "opacity-0"
            }`}
          >
            “What would ready sound like — if you said it out loud?”
          </p>

          <ul
            className={`space-y-2 text-base leading-7 text-[var(--lp-muted)] transition-all duration-700 ${
              show("suggest") ? "opacity-100" : "opacity-0"
            }`}
          >
            <li>Try naming what you need.</li>
            <li>Slow the opening line.</li>
            <li>Leave room for their answer.</li>
          </ul>

          <p
            className={`font-[family-name:var(--font-lp-display)] text-xl transition-all duration-700 sm:text-2xl ${
              show("retry") ? "opacity-100" : "opacity-0"
            }`}
          >
            They try again.
          </p>

          <div
            className={`transition-all duration-700 ${
              show("meter") ? "opacity-100" : "opacity-0"
            }`}
          >
            <p className="text-xs uppercase tracking-[0.28em] text-[var(--lp-muted)]">
              Readiness
            </p>
            <div className="lp-meter mt-3 h-1.5 overflow-hidden rounded-full bg-[var(--lp-line)]">
              <div className="lp-meter-fill h-full rounded-full bg-[var(--lp-gold)]" />
            </div>
          </div>
        </div>
      </div>

      <div
        className={`mx-auto mt-20 flex justify-center transition-all duration-[1600ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
          show("device")
            ? "translate-y-0 opacity-100"
            : "translate-y-16 opacity-0"
        }`}
      >
        <div className="lp-phone relative w-[200px] sm:w-[230px]">
          <div className="overflow-hidden rounded-[2rem] border border-[var(--lp-line)] bg-[var(--lp-ink)] shadow-[0_40px_80px_-48px_rgba(18,20,23,0.5)]">
            <div className="relative aspect-[9/19] w-full">
              <Image
                src="/landing/chapter-product.jpg"
                alt=""
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
