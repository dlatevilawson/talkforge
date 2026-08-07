import Link from "next/link";
import type { Metadata } from "next";
import { getProPriceLabel } from "@/lib/billing/config";
import { getBillingFreeLimits } from "@/lib/billing/config";

export const metadata: Metadata = {
  title: "Membership",
  description:
    "Join TalkForge — Free to experience deliberate practice, Pro for unlimited coaching.",
};

export default function MembershipPage() {
  const price = getProPriceLabel();
  const free = getBillingFreeLimits();

  return (
    <main className="lp-root min-h-[100dvh] bg-[var(--lp-bg)] px-5 py-24 text-[var(--lp-ink)] sm:px-8">
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
          Membership
        </p>
        <h1 className="mt-5 font-[family-name:var(--font-lp-display),serif] text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          A place to practice the conversations that matter.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--lp-muted)]">
          TalkForge isn’t selling software theater. It’s a communication gym —
          preparation, confidence, and mastery through deliberate practice.
          Subscribe when you want to keep going.
        </p>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          <section className="rounded-[1.75rem] border border-[var(--lp-line)] bg-[var(--lp-bg)] p-7">
            <h2 className="text-xl font-semibold">Free</h2>
            <p className="mt-2 text-sm text-[var(--lp-muted)]">
              What you get today
            </p>
            <ul className="mt-6 space-y-3 text-sm leading-6 text-[var(--lp-ink)]/85">
              <li>Create an account and explore the gym</li>
              <li>Browse every communication category</li>
              <li>Talk with Coach Forge</li>
              <li>
                Up to {free.maxPracticeSessions} complete coaching sessions
              </li>
              <li>Experience a full coaching cycle end to end</li>
            </ul>
            <p className="mt-6 text-sm text-[var(--lp-muted)]">$0</p>
            <Link
              href="/signup"
              className="mt-6 inline-flex rounded-full border border-[var(--lp-line)] px-6 py-3 text-sm font-semibold"
            >
              Start free
            </Link>
          </section>

          <section className="rounded-[1.75rem] border border-[var(--lp-ink)] bg-[var(--lp-ink)] p-7 text-[var(--lp-bg)]">
            <h2 className="text-xl font-semibold">Pro</h2>
            <p className="mt-2 text-sm text-white/65">What’s included</p>
            <ul className="mt-6 space-y-3 text-sm leading-6 text-white/90">
              <li>Unlimited practice sessions</li>
              <li>Unlimited voice coaching</li>
              <li>Longer sessions when you need them</li>
              <li>Personalized coaching & conversation memory</li>
              <li>Progress tracking</li>
              <li>Future premium coaching improvements</li>
            </ul>
            <p className="mt-6 text-sm text-white/70">
              {price} · Cancel anytime
            </p>
            <Link
              href="/app/billing"
              className="mt-6 inline-flex rounded-full bg-[var(--lp-bg)] px-6 py-3 text-sm font-semibold text-[var(--lp-ink)]"
            >
              Continue with Pro
            </Link>
          </section>
        </div>

        <section className="mt-16 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            Simple answers
          </h2>
          <dl className="mt-8 space-y-6 text-base leading-7">
            <div>
              <dt className="font-medium">What do I get today?</dt>
              <dd className="mt-2 text-[var(--lp-muted)]">
                Free membership lets you feel what deliberate practice with Forge
                is like — including real coaching sessions — before you decide.
              </dd>
            </div>
            <div>
              <dt className="font-medium">What’s included with Pro?</dt>
              <dd className="mt-2 text-[var(--lp-muted)]">
                Unlimited practice so consistency stays available when the
                conversation that matters is tomorrow.
              </dd>
            </div>
            <div>
              <dt className="font-medium">How much does it cost?</dt>
              <dd className="mt-2 text-[var(--lp-muted)]">{price}</dd>
            </div>
            <div>
              <dt className="font-medium">Can I cancel anytime?</dt>
              <dd className="mt-2 text-[var(--lp-muted)]">
                Yes. Manage payment methods, invoices, and cancellation in the
                secure billing portal — no support ticket required.
              </dd>
            </div>
          </dl>
        </section>

        <p className="mt-14 text-sm text-[var(--lp-muted)]">
          No countdown timers. No pressure. Just practice — and upgrade when
          you’re ready to keep going.
        </p>
      </div>
    </main>
  );
}
