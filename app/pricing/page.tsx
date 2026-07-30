import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Pricing",
  description: "TalkForge founding access — join the waitlist.",
};

export default function PricingPage() {
  return (
    <main className="lp-root min-h-[100dvh] bg-[var(--lp-bg)] px-5 py-24 text-[var(--lp-ink)] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
          Pricing
        </p>
        <h1 className="mt-5 font-[family-name:var(--font-lp-display),serif] text-4xl font-semibold tracking-[-0.03em]">
          Founding access first.
        </h1>
        <p className="mt-6 text-lg leading-8 text-[var(--lp-muted)]">
          We&apos;re preparing the Communication Gym carefully. Join Founding
          Members on the homepage — pricing for the wider floor comes later.
        </p>
        <div className="mt-10 flex flex-wrap gap-4">
          <Link
            href="/#waitlist"
            className="rounded-full bg-[var(--lp-ink)] px-6 py-3 text-sm font-semibold text-[var(--lp-bg)]"
          >
            Join the waitlist
          </Link>
          <Link href="/signup" className="rounded-full border border-[var(--lp-line)] px-6 py-3 text-sm font-semibold">
            Start Training
          </Link>
        </div>
      </div>
    </main>
  );
}
