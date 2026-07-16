"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { getUser } from "@/lib/storage";

const links = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/training", label: "Practice" },
  { href: "/progress", label: "Progress" },
  { href: "/profile", label: "Profile" },
];

const navLinks =
  process.env.NODE_ENV === "development"
    ? [...links, { href: "/atlas", label: "Atlas" }]
    : links;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [name, setName] = useState("Guest");

  useEffect(() => {
    let cancelled = false;

    async function loadName() {
      try {
        const user = await getUser();
        if (!cancelled) {
          setName(user?.displayName ?? "Guest");
        }
      } catch {
        if (!cancelled) {
          setName("Guest");
        }
      }
    }

    void loadName();
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  return (
    <div className="min-h-screen bg-[var(--tf-bg)] font-sans text-[var(--tf-fg)]">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/dashboard" className="text-lg font-semibold tracking-wide">
            TalkForge
          </Link>

          <nav
            aria-label="Primary"
            className="flex flex-wrap items-center gap-1 sm:gap-2"
          >
            {navLinks.map((link) => {
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

          <p className="text-sm text-zinc-400">{name}</p>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
