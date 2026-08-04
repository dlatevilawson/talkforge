"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
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
  { href: "/app", label: "Home" },
  { href: "/app/profile", label: "Profile" },
  { href: "/app/dashboard", label: "Activity" },
  { href: "/app/progress", label: "Progress" },
  { href: "/app/settings", label: "Settings" },
] as const;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [name, setName] = useState("Friend");
  const [showFounder, setShowFounder] = useState(false);

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

  async function logout() {
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

  if (pathname === "/app") {
    const initial = name.trim().charAt(0).toUpperCase() || "F";

    return (
      <div className="min-h-screen overflow-hidden bg-[#090b0d] font-sans text-[var(--tf-fg)]">
        <header className="relative z-20">
          <div className="mx-auto flex h-20 max-w-[1440px] items-center justify-between px-5 sm:h-24 sm:px-8 lg:px-12">
            <Link
              href="/app"
              className="group flex items-center gap-3.5"
              aria-label="TalkForge Communication Gym home"
            >
              <span className="grid size-8 place-items-center rounded-[10px] border border-white/10 bg-white/[0.04] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition-colors group-hover:border-[#f0c97d]/30">
                <span className="text-[9px] font-bold tracking-[0.12em] text-[#d8b875]">
                  TF
                </span>
              </span>
              <span className="flex flex-col">
                <span className="text-sm font-semibold tracking-[-0.01em] text-[#f4f3ef]">
                  TalkForge
                </span>
                <span className="text-[9px] font-medium uppercase tracking-[0.18em] text-zinc-600">
                  Communication Gym
                </span>
              </span>
            </Link>

            <Link
              href="/app/profile"
              className="group flex items-center gap-3 rounded-full py-1 pl-3 text-right"
              aria-label={`Open ${name}’s Living Profile`}
            >
              <span className="hidden flex-col sm:flex">
                <span className="text-xs font-medium text-zinc-300">{name}</span>
                <span className="text-[10px] text-zinc-600">Living Profile</span>
              </span>
              <span className="grid size-9 place-items-center rounded-full border border-white/10 bg-white/[0.05] text-xs font-semibold text-zinc-300 transition group-hover:border-white/20 group-hover:bg-white/[0.08]">
                {initial}
              </span>
            </Link>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1440px] px-5 sm:px-8 lg:px-12">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--tf-bg)] font-sans text-[var(--tf-fg)]">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/app" className="text-lg font-semibold tracking-wide">
            TalkForge
          </Link>

          <nav
            aria-label="Primary"
            className="flex flex-wrap items-center gap-1 sm:gap-2"
          >
            {nav.map((link) => {
              const active =
                pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`rounded-full px-3 py-2 text-sm transition ${
                    active
                      ? "bg-white text-black"
                      : "text-zinc-300 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <p className="text-sm text-zinc-400">{name}</p>
            <button
              type="button"
              onClick={() => void logout()}
              className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-zinc-300 hover:bg-white/10"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
