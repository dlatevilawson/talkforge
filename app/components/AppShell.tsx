"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { canAccessFounderPortal } from "@/lib/auth/roles";
import type { UserRole } from "@/lib/auth/constants";
import { clearCurrentUserId, setCurrentUserId } from "@/lib/identity";
import { trackAuthEvent } from "@/lib/auth/analytics";

const links = [
  { href: "/app/dashboard", label: "Dashboard" },
  { href: "/app/practice", label: "Practice" },
  { href: "/app/progress", label: "Progress" },
  { href: "/app/profile", label: "Profile" },
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
        if (data.userId) {
          setCurrentUserId(data.userId);
        }
        const display = data.displayName?.trim();
        setName(display && display !== "Guest" ? display : "Friend");
        setShowFounder(
          canAccessFounderPortal(
            (data.role as UserRole | null) ?? null
          )
        );
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
    router.push("/");
    router.refresh();
  }

  const nav = showFounder
    ? [...links, { href: "/founder", label: "Founder Portal" }]
    : links;

  return (
    <div className="min-h-screen bg-[var(--tf-bg)] font-sans text-[var(--tf-fg)]">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/app/dashboard" className="text-lg font-semibold tracking-wide">
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
