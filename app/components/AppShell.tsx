"use client";

import TalkForgeLogo from "@/app/components/landing/TalkForgeLogo";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { canAccessFounderPortal } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/auth/constants";
import { migrateGuestPracticeData } from "@/lib/auth/migrate-guest";
import { trackAuthEvent } from "@/lib/auth/analytics";
import {
  bindAuthenticatedUserId,
  clearCurrentUserId,
  clearPendingGuestUserId,
  getCurrentUserId,
  isGuestUserId,
  stashPendingGuestUserId,
} from "@/lib/identity";

const links = [
  { href: "/app/progress", label: "Progress" },
  { href: "/app/dashboard", label: "Training history" },
  { href: "/app/profile", label: "Living Profile" },
  { href: "/app/settings", label: "Settings" },
] as const;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState("Friend");
  const [showFounder, setShowFounder] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/auth/session");
        const data = (await res.json()) as {
          authenticated?: boolean;
          displayName?: string | null;
          role?: string | null;
          userId?: string | null;
        };
        if (cancelled) return;
        if (data.authenticated && data.userId) {
          const prior = getCurrentUserId();
          if (prior && isGuestUserId(prior) && prior !== data.userId) {
            stashPendingGuestUserId(prior);
          }
          bindAuthenticatedUserId(data.userId);
          void migrateGuestPracticeData(data.userId);
          const display = data.displayName?.trim();
          setName(
            display && display !== "Guest" ? display : "Friend"
          );
          setShowFounder(
            canAccessFounderPortal(
              (data.role as UserRole | null) ?? null
            )
          );
        } else {
          // Logged out / guest mode: drop any stale auth UUID pointer.
          const prior = getCurrentUserId();
          if (prior && !isGuestUserId(prior)) {
            clearCurrentUserId();
          }
          setName("Friend");
          setShowFounder(false);
        }
      } catch {
        if (!cancelled) setName("Friend");
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  useEffect(() => {
    if (!menuOpen) return;

    function closeOnOutsidePress(event: PointerEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setMenuOpen(false);
      }
    }

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
      }
    }

    document.addEventListener("pointerdown", closeOnOutsidePress);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsidePress);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [menuOpen]);

  async function logout() {
    setMenuOpen(false);
    trackAuthEvent("auth_logout");
    await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "logout" }),
    });
    clearCurrentUserId();
    clearPendingGuestUserId();
    router.push("/");
    router.refresh();
  }

  const nav = showFounder
    ? [...links, { href: "/founder", label: "Founder Portal" }]
    : links;

  if (pathname === "/app/practice") {
    return (
      <div className="min-h-screen bg-[#07070a] font-sans text-[var(--tf-fg)]">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--tf-bg)] font-sans text-[var(--tf-fg)]">
      <header className="relative z-50 bg-[#050505]/85 backdrop-blur-xl">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link
            href="/app"
            className="rounded-md transition-opacity hover:opacity-80"
            aria-label="TalkForge home"
          >
            <TalkForgeLogo tone="light" />
          </Link>

          <div ref={menuRef} className="relative">
            <button
              type="button"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-controls="app-account-menu"
              onClick={() => setMenuOpen((open) => !open)}
              className="flex min-h-11 items-center gap-3 rounded-full border border-white/[0.08] bg-white/[0.025] py-1.5 pl-2 pr-3.5 text-sm text-zinc-400 transition hover:border-white/15 hover:bg-white/[0.05] hover:text-white"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-[#e7d6b1] text-[0.68rem] font-semibold uppercase text-[#19150f]">
                {name.charAt(0) || "F"}
              </span>
              <span className="hidden max-w-28 truncate sm:block">{name}</span>
              <svg
                viewBox="0 0 16 16"
                fill="none"
                className={`h-3.5 w-3.5 transition-transform ${
                  menuOpen ? "rotate-180" : ""
                }`}
                aria-hidden
              >
                <path
                  d="m4 6 4 4 4-4"
                  stroke="currentColor"
                  strokeWidth="1.4"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            {menuOpen ? (
              <nav
                id="app-account-menu"
                aria-label="Account and gym"
                className="absolute right-0 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#111214]/95 p-2 shadow-[0_24px_70px_rgba(0,0,0,.55)] backdrop-blur-2xl"
              >
                <Link
                  href="/app"
                  onClick={() => setMenuOpen(false)}
                  className={`block rounded-xl px-3.5 py-2.5 text-sm transition ${
                    pathname === "/app"
                      ? "bg-white/[0.08] text-white"
                      : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  Home
                </Link>
                {nav.map((link) => {
                  const active =
                    pathname === link.href ||
                    pathname.startsWith(`${link.href}/`);
                  return (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setMenuOpen(false)}
                      className={`block rounded-xl px-3.5 py-2.5 text-sm transition ${
                        active
                          ? "bg-white/[0.08] text-white"
                          : "text-zinc-400 hover:bg-white/[0.05] hover:text-white"
                      }`}
                    >
                      {link.label}
                    </Link>
                  );
                })}
                <div className="my-2 h-px bg-white/[0.07]" />
                <button
                  type="button"
                  onClick={() => void logout()}
                  className="block w-full rounded-xl px-3.5 py-2.5 text-left text-sm text-zinc-500 transition hover:bg-white/[0.05] hover:text-zinc-200"
                >
                  Sign out
                </button>
              </nav>
            ) : null}
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
        {children}
      </div>
    </div>
  );
}
