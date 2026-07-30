"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import TalkForgeLogo from "@/app/components/landing/TalkForgeLogo";

const links = [
  { href: "/", label: "Home" },
  { href: "/#experience", label: "Features" },
  { href: "/pricing", label: "Pricing" },
  { href: "/about", label: "About" },
] as const;

export default function LandingNav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [authed, setAuthed] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    void fetch("/api/auth/session")
      .then((r) => r.json())
      .then((d: { authenticated?: boolean }) => setAuthed(Boolean(d.authenticated)))
      .catch(() => setAuthed(false));
  }, []);

  const onFilm = !scrolled;
  const startHref = authed ? "/app/dashboard" : "/signup";
  const startLabel = authed ? "Open Gym" : "Start Training";

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background,box-shadow,backdrop-filter,border-color] duration-300 ${
        scrolled
          ? "border-b border-[var(--lp-line)] bg-[color-mix(in_oklab,var(--lp-bg)_88%,transparent)] shadow-[0_1px_0_rgba(0,0,0,0.04)] backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
        <Link
          href="/"
          className="transition-opacity hover:opacity-80"
          aria-label="TalkForge home"
        >
          <TalkForgeLogo tone={onFilm ? "light" : "default"} />
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm transition-colors ${
                onFilm
                  ? "text-[#d9d2c5]/90 hover:text-[#f7f3ea]"
                  : "text-[var(--lp-muted)] hover:text-[var(--lp-ink)]"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/login"
            className={`text-sm transition-colors ${
              onFilm
                ? "text-[#d9d2c5]/90 hover:text-[#f7f3ea]"
                : "text-[var(--lp-muted)] hover:text-[var(--lp-ink)]"
            }`}
          >
            Login
          </Link>
          <Link
            href={startHref}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${
              onFilm
                ? "bg-[var(--tf-gold)] text-[#121417] hover:bg-[var(--tf-gold-light)]"
                : "bg-[var(--lp-ink)] text-[var(--lp-bg)] hover:bg-[var(--lp-ink-soft)]"
            }`}
          >
            {startLabel}
          </Link>
        </nav>

        <button
          type="button"
          className={`inline-flex h-10 w-10 items-center justify-center rounded-full md:hidden ${
            onFilm
              ? "border border-white/25 text-[#f7f3ea]"
              : "border border-[var(--lp-line)] text-[var(--lp-ink)]"
          }`}
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
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setOpen(false)}
                className="py-2 text-base text-[var(--lp-ink)]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="py-2 text-base text-[var(--lp-ink)]"
            >
              Login
            </Link>
            <Link
              href={startHref}
              onClick={() => setOpen(false)}
              className="mt-2 rounded-full bg-[var(--lp-ink)] px-4 py-3 text-center text-sm font-medium text-[var(--lp-bg)]"
            >
              {startLabel}
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
