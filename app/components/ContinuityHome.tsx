"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { buildAdaptiveHome } from "@/lib/system2";
import type { AdaptiveHomeModel } from "@/lib/system2";
import { emptyLivingProfile } from "@/lib/system1/profile";
import type { LivingProfile } from "@/lib/system1/types";
import { getUser } from "@/lib/storage";

/**
 * Adaptive Homepage stub — AUDIT-001 C3 remediation.
 * Single continuity CTA. No mission menu. Not an analytics dashboard.
 */
export default function ContinuityHome() {
  const [home, setHome] = useState<AdaptiveHomeModel | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const user = await getUser();
        let profile: LivingProfile | null = null;
        if (user?.id) {
          try {
            const res = await fetch("/api/living-profile", { cache: "no-store" });
            if (res.ok) {
              const data = (await res.json()) as { profile?: LivingProfile | null };
              profile = data.profile ?? null;
            }
          } catch {
            // Soft-fail: continuity stub still works without LP table
          }
          if (!profile) {
            profile = emptyLivingProfile(user.id, user.displayName ?? "");
          }
        }
        if (!cancelled) {
          setHome(buildAdaptiveHome(profile));
        }
      } catch {
        if (!cancelled) {
          setHome(buildAdaptiveHome(null));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const recommendation = home?.recommendation;
  const readiness = home?.readiness;

  return (
    <section className="rounded-3xl border border-white/10 bg-gradient-to-b from-zinc-900/80 to-black/40 p-6 sm:p-10">
      <p className="text-sm uppercase tracking-[0.24em] text-zinc-500">
        TalkForge
      </p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
        {loading ? "Welcome back" : "Continue becoming"}
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400">
        {loading
          ? "Getting your space ready…"
          : recommendation?.continuityLine ??
            "Tell Forge what conversation matters — no topic menu."}
      </p>

      {readiness && !readiness.profileGatePassed && (
        <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-500">
          Living Profile → Readiness → Homepage → Coaching. We will not ask you
          to pick a mission before the system knows enough about who you are
          becoming.
        </p>
      )}

      {readiness && readiness.ranked.length > 1 && (
        <p className="mt-3 max-w-2xl text-xs leading-5 text-zinc-600">
          Readiness narrowed {readiness.ranked.length} candidates to one next
          step — not a mission menu.
        </p>
      )}

      <div className="mt-8 flex flex-wrap gap-3">
        {!readiness?.profileGatePassed ? (
          <Link
            href="/app/profile"
            className="rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            Complete Living Profile
          </Link>
        ) : (
          <Link
            href={recommendation?.href ?? "/app/practice"}
            className="rounded-full bg-white px-6 py-3.5 text-sm font-semibold text-black transition hover:bg-zinc-200"
          >
            {recommendation?.title ?? "Practice with Forge"}
          </Link>
        )}
        <Link
          href="/app/profile"
          className="rounded-full border border-white/15 px-5 py-3.5 text-sm font-medium text-zinc-200 transition hover:bg-white/10"
        >
          Living Profile
        </Link>
      </div>

      <p className="mt-10 text-xs leading-5 text-zinc-600">
        Activity and scores live under Dashboard — not here. Continuity is the
        product (Forge Law #017).
      </p>
    </section>
  );
}
