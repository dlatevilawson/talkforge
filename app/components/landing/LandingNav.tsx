"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TalkForgeLogo from "@/app/components/landing/TalkForgeLogo";

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background,backdrop-filter,border-color] duration-500 ${
        scrolled
          ? "border-b border-[var(--lp-line)] bg-[color-mix(in_oklab,var(--lp-bg)_86%,transparent)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link
          href="/"
          className="text-[var(--lp-ink)] transition-opacity hover:opacity-70"
          aria-label="TalkForge home"
        >
          <TalkForgeLogo />
        </Link>
        <a
          href="#begin"
          className="text-sm font-medium tracking-wide text-[var(--lp-ink)] transition-opacity hover:opacity-70"
        >
          Forge Your Voice
        </a>
      </div>
    </header>
  );
}
