"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TalkForgeLogo from "@/app/components/landing/TalkForgeLogo";

/** Minimal nav — mark stays sacred; never competes with hero. */
export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    const t = window.setTimeout(() => setReady(true), 3800);
    return () => {
      window.removeEventListener("scroll", onScroll);
      clearTimeout(t);
    };
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-700 ${
        ready ? "opacity-100" : "pointer-events-none opacity-0"
      } ${
        scrolled
          ? "border-b border-[var(--lp-line)] bg-[color-mix(in_oklab,var(--lp-bg)_90%,transparent)] text-[var(--lp-ink)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent text-white"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="transition-opacity hover:opacity-70"
          aria-label="TalkForge home"
        >
          <TalkForgeLogo variant="mark" />
        </Link>
        <a
          href="#begin"
          className={`text-sm font-medium tracking-wide transition-opacity hover:opacity-70 ${
            scrolled ? "text-[var(--lp-ink)]" : "text-white/85"
          }`}
        >
          Begin
        </a>
      </div>
    </header>
  );
}
