"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

const scenes = [
  {
    image: "/landing/story-father.jpg",
    headline: "Tonight he apologizes.",
    subtext: "He practiced first.",
  },
  {
    image: "/landing/story-graduate.jpg",
    headline: "Today she interviews.",
    subtext: "She practiced first.",
  },
  {
    image: "/landing/story-manager.jpg",
    headline: "This conversation changes someone’s career.",
    subtext: "They practiced first.",
  },
  {
    image: "/landing/story-teen.jpg",
    headline: "The first day at a new school.",
    subtext: "They practiced first.",
  },
] as const;

/**
 * Recognition — cinematic sequence of life moments.
 * Never says “communication.” Still sells it.
 */
export default function TransformationStories() {
  const refs = useRef<(HTMLElement | null)[]>([]);
  const [visible, setVisible] = useState<boolean[]>(() =>
    scenes.map(() => false)
  );

  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setVisible(scenes.map(() => true));
      return;
    }

    const observers = refs.current.map((node, index) => {
      if (!node) return null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry?.isIntersecting) {
            setVisible((prev) => {
              const next = [...prev];
              next[index] = true;
              return next;
            });
            observer.disconnect();
          }
        },
        { threshold: 0.45 }
      );
      observer.observe(node);
      return observer;
    });

    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  return (
    <section id="stories" className="scroll-mt-0 bg-black">
      {scenes.map((scene, index) => (
        <article
          key={scene.headline}
          ref={(el) => {
            refs.current[index] = el;
          }}
          className="lp-scene relative flex min-h-[100dvh] items-end overflow-hidden"
        >
          <Image
            src={scene.image}
            alt=""
            fill
            className={`object-cover transition-all duration-[2000ms] ease-[cubic-bezier(0.22,1,0.36,1)] ${
              visible[index]
                ? "scale-100 opacity-100"
                : "scale-[1.04] opacity-40"
            }`}
            sizes="100vw"
            priority={index === 0}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black via-black/45 to-black/20" />
          <div
            className={`relative z-10 w-full px-5 pb-24 transition-all duration-[1400ms] ease-[cubic-bezier(0.22,1,0.36,1)] sm:px-12 sm:pb-32 ${
              visible[index]
                ? "translate-y-0 opacity-100"
                : "translate-y-8 opacity-0"
            }`}
          >
            <p className="text-xs font-medium uppercase tracking-[0.32em] text-[var(--lp-gold)]/80">
              {index === 0 ? "Recognition" : "\u00a0"}
            </p>
            <h2 className="mt-5 max-w-3xl font-[family-name:var(--font-lp-display)] text-4xl font-semibold leading-[1.1] tracking-[-0.04em] text-white sm:text-6xl md:text-7xl">
              {scene.headline}
            </h2>
            <p className="mt-8 text-base tracking-wide text-white/70 sm:text-lg">
              {scene.subtext}
            </p>
          </div>
        </article>
      ))}
    </section>
  );
}
