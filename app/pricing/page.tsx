import Link from "next/link";
import type { Metadata } from "next";
import { connection } from "next/server";
import MembershipCheckoutButton from "@/app/components/billing/MembershipCheckoutButton";
import { resolveMembershipOffer } from "@/lib/billing/offer";

export const metadata: Metadata = {
  title: "Founding Members",
  description:
    "Join TalkForge Founding Members — membership pricing and Stripe checkout for Pro.",
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string | string[] }>;
}) {
  await connection();
  const params = await searchParams;
  const checkoutRaw = Array.isArray(params.checkout)
    ? params.checkout[0]
    : params.checkout;
  const autoStart = checkoutRaw === "1";
  const offer = await resolveMembershipOffer();

  return (
    <main className="lp-root min-h-[100dvh] bg-[var(--lp-bg)] px-5 py-24 text-[var(--lp-ink)] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <p className="text-xs font-medium uppercase tracking-[0.28em] text-[var(--lp-muted)]">
          Founding Members
        </p>
        <h1 className="mt-5 font-[family-name:var(--font-lp-display),serif] text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          Join the first members of the communication gym.
        </h1>
        <p className="mt-6 text-lg leading-8 text-[var(--lp-muted)]">
          Founding membership is TalkForge Pro — unlimited coaching practice,
          voice sessions, and memory with Coach Forge. Cancel anytime.
        </p>

        <section className="mt-12 rounded-[1.75rem] border border-[var(--lp-ink)] bg-[var(--lp-ink)] px-7 py-8 text-[var(--lp-bg)]">
          <p className="text-sm uppercase tracking-[0.2em] text-white/55">
            {offer.productName?.trim() || "TalkForge Pro"}
          </p>
          <p className="mt-4 text-4xl font-semibold tracking-tight">
            {offer.priceLabel}
          </p>
          <p className="mt-3 text-sm leading-6 text-white/70">
            Monthly membership · Cancel anytime · Secure checkout with Stripe
          </p>
          <ul className="mt-8 space-y-3 text-sm leading-6 text-white/90">
            <li>Unlimited coaching sessions</li>
            <li>Unlimited voice practice</li>
            <li>Personalized coaching memory</li>
            <li>Founding Member recognition</li>
          </ul>

          <div className="mt-8 max-w-sm">
            {offer.configured ? (
              <MembershipCheckoutButton
                source="pricing_founding"
                label="Become a Founding Member"
                autoStart={autoStart}
                loginNext="/pricing?checkout=1"
                className="w-full rounded-full bg-[var(--lp-bg)] px-8 py-3.5 text-sm font-semibold text-[var(--lp-ink)] transition hover:opacity-90 disabled:opacity-50"
              />
            ) : (
              <MembershipCheckoutButton
                source="pricing_founding"
                label="Become a Founding Member"
                disabled
                disabledHint="Membership checkout is almost ready. Check back shortly, or start free while we finish connecting Stripe."
                className="w-full rounded-full bg-[var(--lp-bg)] px-8 py-3.5 text-sm font-semibold text-[var(--lp-ink)] transition hover:opacity-90 disabled:opacity-50"
              />
            )}
          </div>
        </section>

        <div className="mt-10 flex flex-wrap gap-4 text-sm">
          <Link
            href="/signup?next=%2Fpricing%3Fcheckout%3D1"
            className="rounded-full border border-[var(--lp-line)] px-6 py-3 font-semibold"
          >
            Start free first
          </Link>
          <Link
            href="/membership"
            className="rounded-full px-6 py-3 font-semibold text-[var(--lp-muted)] underline-offset-4 hover:underline"
          >
            Full membership details
          </Link>
        </div>
      </div>
    </main>
  );
}
