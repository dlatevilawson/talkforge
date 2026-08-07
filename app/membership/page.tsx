import Link from "next/link";
import type { Metadata } from "next";
import { getProPriceLabel } from "@/lib/billing/config";
import { BECOME_PRO_MEMBER_CTA } from "@/lib/billing/member-copy";

export const metadata: Metadata = {
  title: "Membership",
  description:
    "Join TalkForge — complimentary coaching to discover deliberate practice, Pro to continue your communication journey.",
};

export default function MembershipPage() {
  const price = getProPriceLabel();

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
          TalkForge is a communication gym — preparation, confidence, and
          mastery through deliberate practice. Value first. Price only when
          you’re ready to keep going.
        </p>

        <div className="mt-14 grid gap-8 md:grid-cols-2">
          <section className="rounded-[1.75rem] border border-[var(--lp-line)] bg-[var(--lp-bg)] p-7">
            <h2 className="text-xl font-semibold">Free</h2>
            <p className="mt-2 text-sm text-[var(--lp-muted)]">
              Perfect for discovering TalkForge.
            </p>
            <ul className="mt-6 space-y-3 text-sm leading-6 text-[var(--lp-ink)]/85">
              <li>Explore every communication category</li>
              <li>Experience Coach Forge</li>
              <li>Complete your complimentary coaching sessions</li>
              <li>Discover how deliberate practice works</li>
            </ul>
            <Link
              href="/signup"
              className="mt-8 inline-flex rounded-full border border-[var(--lp-line)] px-6 py-3 text-sm font-semibold"
            >
              Start free
            </Link>
          </section>

          <section className="rounded-[1.75rem] border border-[var(--lp-ink)] bg-[var(--lp-ink)] p-7 text-[var(--lp-bg)]">
            <h2 className="text-xl font-semibold">Pro</h2>
            <p className="mt-2 text-sm text-white/65">
              Built for people who want to master conversations that matter.
            </p>
            <ul className="mt-6 space-y-3 text-sm leading-6 text-white/90">
              <li>Unlimited coaching sessions</li>
              <li>Unlimited voice practice</li>
              <li>Personalized coaching memory</li>
              <li>Deeper coaching insights</li>
              <li>Early access to future premium coaching features</li>
            </ul>
            <p className="mt-8 text-sm text-white/70">
              {price} · Cancel anytime
            </p>
            <Link
              href="/app/billing"
              className="mt-6 inline-flex rounded-full bg-[var(--lp-bg)] px-6 py-3 text-sm font-semibold text-[var(--lp-ink)]"
            >
              {BECOME_PRO_MEMBER_CTA}
            </Link>
          </section>
        </div>

        <section className="mt-20 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight">
            Membership FAQ
          </h2>
          <dl className="mt-8 space-y-7 text-base leading-7">
            <div>
              <dt className="font-medium">Can I cancel anytime?</dt>
              <dd className="mt-2 text-[var(--lp-muted)]">
                Yes. Cancel from the billing portal whenever you like — no
                support ticket required.
              </dd>
            </div>
            <div>
              <dt className="font-medium">
                Will I lose my coaching history if I cancel?
              </dt>
              <dd className="mt-2 text-[var(--lp-muted)]">
                No. Your coaching history and Living Profile stay with your
                account. Canceling only pauses ongoing Pro access after your
                current period ends.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Can I restart later?</dt>
              <dd className="mt-2 text-[var(--lp-muted)]">
                Absolutely. Whenever another important conversation comes along,
                you can become a Pro Member again and pick up where you left
                off.
              </dd>
            </div>
            <div>
              <dt className="font-medium">
                Does my membership renew automatically?
              </dt>
              <dd className="mt-2 text-[var(--lp-muted)]">
                Yes. Pro renews monthly until you cancel. You’ll keep full
                access through the end of the period you’ve already paid for.
              </dd>
            </div>
            <div>
              <dt className="font-medium">Can I update my payment method?</dt>
              <dd className="mt-2 text-[var(--lp-muted)]">
                Yes — update your card, download invoices, and manage billing in
                the secure customer portal from your Billing page.
              </dd>
            </div>
            <div>
              <dt className="font-medium">
                Will more membership options be available in the future?
              </dt>
              <dd className="mt-2 text-[var(--lp-muted)]">
                Possibly. Today we keep it simple: Free to discover, Pro to
                continue. If we add options later, they’ll stay clear and
                optional — never pressured.
              </dd>
            </div>
          </dl>
        </section>

        <p className="mt-14 text-sm text-[var(--lp-muted)]">
          No countdown timers. No pressure. Practice first — become a Pro Member
          when you’re ready to keep going.
        </p>
      </div>
    </main>
  );
}
