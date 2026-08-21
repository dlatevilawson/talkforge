import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "TalkForge — a company building the world's communication gym.",
};

export default function AboutPage() {
  return (
    <main className="lp-root min-h-[100dvh] bg-[var(--lp-bg)] px-5 py-24 text-[var(--lp-ink)] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
          About
        </p>
        <h1 className="mt-5 font-[family-name:var(--font-lp-display),serif] text-4xl font-semibold tracking-[-0.03em]">
          When you speak, you will be heard.
        </h1>
        <p className="mt-6 text-lg leading-8 text-[var(--lp-muted)]">
          The deepest security in life comes from knowing that when you speak,
          you will be heard. We build the private arena where you rehearse the
          conversations that shape your career, status, and peace of mind.
        </p>
        <Link href="/" className="mt-10 inline-block text-sm text-[var(--lp-ink)] underline">
          ← Home
        </Link>
      </div>
    </main>
  );
}
