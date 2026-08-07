"use client";

import Link from "next/link";
import { useState } from "react";
import { trackBillingEvent } from "@/lib/billing/analytics";

type Props = {
  message?: string | null;
};

export default function EndOfFreePractice({ message }: Props) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function upgrade() {
    setPending(true);
    setError("");
    trackBillingEvent("billing_upgrade_started", { source: "end_of_free" });
    try {
      const res = await fetch("/api/billing/checkout", { method: "POST" });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        throw new Error(data.error || "Could not start checkout.");
      }
      window.location.assign(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setPending(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-hidden bg-[#07070a] text-white">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_30%,rgba(201,169,95,0.14),transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto flex min-h-[100dvh] max-w-xl flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[#c9a95f]">
          Coach Forge
        </p>
        <h1 className="mt-6 text-3xl font-semibold tracking-tight sm:text-4xl">
          You’ve completed your complimentary practice sessions.
        </h1>
        <p className="mt-5 max-w-md text-base leading-7 text-white/55">
          {message?.trim() ||
            "Communication improves through consistent practice. Continue training anytime with TalkForge Pro."}
        </p>

        <div className="mt-10 flex w-full max-w-sm flex-col gap-3">
          <button
            type="button"
            onClick={() => void upgrade()}
            disabled={pending}
            className="rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
          >
            {pending ? "Opening checkout…" : "Continue with Pro"}
          </button>
          <Link
            href="/app"
            className="rounded-full border border-white/10 px-8 py-3.5 text-sm text-white/55 transition hover:bg-white/10"
          >
            Maybe Later
          </Link>
        </div>

        {error ? (
          <p className="mt-6 text-sm text-red-300" role="alert">
            {error}
          </p>
        ) : null}

        <p className="mt-10 text-sm text-white/35">
          Your account stays open. Explore Progress, Living Profile, and Home
          anytime.
        </p>
      </div>
    </main>
  );
}
