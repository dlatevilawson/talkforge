import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Blog",
  description: "TalkForge notes — coming soon.",
};

export default function BlogPage() {
  return (
    <main className="lp-root min-h-[100dvh] bg-[var(--lp-bg)] px-5 py-24 text-[var(--lp-ink)] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
          Blog
        </p>
        <h1 className="mt-5 font-[family-name:var(--font-lp-display),serif] text-4xl font-semibold tracking-[-0.03em]">
          Stories arrive soon.
        </h1>
        <p className="mt-6 text-lg leading-8 text-[var(--lp-muted)]">
          We&apos;re leaving room for mystery — and for writing worth your time.
        </p>
        <Link href="/" className="mt-10 inline-block text-sm underline">
          ← Home
        </Link>
      </div>
    </main>
  );
}
