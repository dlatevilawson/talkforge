import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact TalkForge.",
};

export default function ContactPage() {
  return (
    <main className="lp-root min-h-[100dvh] bg-[var(--lp-bg)] px-5 py-24 text-[var(--lp-ink)] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
          Contact
        </p>
        <h1 className="mt-5 font-[family-name:var(--font-lp-display),serif] text-4xl font-semibold tracking-[-0.03em]">
          Reach the team.
        </h1>
        <p className="mt-6 text-lg leading-8 text-[var(--lp-muted)]">
          For founding inquiries, join the waitlist. Product feedback belongs
          inside the gym after you start training.
        </p>
        <Link href="/#waitlist" className="mt-10 inline-block text-sm underline">
          Join the waitlist →
        </Link>
      </div>
    </main>
  );
}
