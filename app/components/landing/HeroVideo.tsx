"use client";

import { useEffect, useRef } from "react";

/**
 * Official TalkForge hero film — muted autoplay loop (FILM-001).
 * Self-hosted per Next.js video guidance: <video> + muted + playsInline.
 */
export default function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.muted = true;
    const play = () => {
      void el.play().catch(() => {
        /* Autoplay may be blocked until gesture; muted+playsInline usually OK */
      });
    };
    play();
    const onVis = () => {
      if (document.visibilityState === "visible") play();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <video
        ref={ref}
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/video/hero-poster.jpg"
      >
        <source src="/video/hero.mp4" type="video/mp4" />
      </video>
      {/* Warm cinematic scrim — readable type without killing the film */}
      <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,6,4,0.55)_0%,rgba(8,6,4,0.35)_40%,rgba(8,6,4,0.72)_100%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(201,155,74,0.12),transparent_55%)]" />
    </div>
  );
}
