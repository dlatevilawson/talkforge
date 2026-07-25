"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TalkForgeLogo from "@/app/components/landing/TalkForgeLogo";

const links = [
  { href: "#belief", label: "Our Belief" },
  { href: "#experience", label: "Experience" },
  { href: "#mission", label: "Mission" },
  { href: "#faq", label: "FAQ" },
] as const;

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background,box-shadow,backdrop-filter] duration-300 ${
        scrolled
          ? "border-b border-[var(--lp-line)] bg-[color-mix(in_oklab,var(--lp-bg)_88%,transparent)] shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-xl"
          : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="text-[var(--lp-ink)] transition-opacity hover:opacity-80"
          aria-label="TalkForge home"
        >
          <TalkForgeLogo />
        </Link>

        <nav
          aria-label="Primary"
          className="hidden items-center gap-8 md:flex"
        >
          {links.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm text-[var(--lp-muted)] transition-colors hover:text-[var(--lp-ink)]"
            >
              {link.label}
            </a>
          ))}
          <a
            href="#waitlist"
            className="rounded-full bg-[var(--lp-ink)] px-4 py-2 text-sm font-medium text-[var(--lp-bg)] transition hover:bg-[var(--lp-ink-soft)]"
          >
            Join Waitlist
          </a>
        </nav>

        <button
          type="button"
          className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[var(--lp-line)] text-[var(--lp-ink)] md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="sr-only">Menu</span>
          <span aria-hidden className="flex flex-col gap-1.5">
            <span className="block h-px w-4 bg-current" />
            <span className="block h-px w-4 bg-current" />
          </span>
        </button>
      </div>

      {open && (
        <div
          id="mobile-nav"
          className="border-t border-[var(--lp-line)] bg-[var(--lp-bg)] px-5 py-4 md:hidden"
        >
          <nav aria-label="Mobile" className="flex flex-col gap-3">
            {links.map((link) => (
              <a
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-2 text-base text-[var(--lp-ink)]"
              >
                {link.label}
              </a>
            ))}
            <a
              href="#waitlist"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-[var(--lp-ink)] px-4 py-3 text-center text-sm font-medium text-[var(--lp-bg)]"
            >
              Join Waitlist
            </a>
          </nav>
        </div>
      )}
    </header>
  );
}
