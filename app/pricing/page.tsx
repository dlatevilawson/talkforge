import type { Metadata } from "next";
import { connection } from "next/server";
import MembershipCheckoutButton from "@/app/components/billing/MembershipCheckoutButton";
import { resolveMembershipOffer } from "@/lib/billing/offer";

export const metadata: Metadata = {
  title: "Founding Pass",
  description:
    "Join the first members of the TalkForge Private Rehearsal Arena — Claim your Founding Pass.",
};

function foundingPriceAmount(priceLabel: string): string {
  const match = priceLabel.match(/\$[\d.]+/);
  return match?.[0] ?? "$19.99";
}

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
  const compareAt =
    process.env.NEXT_PUBLIC_BILLING_COMPARE_AT_LABEL?.trim() || "$29";
  const amount = foundingPriceAmount(offer.priceLabel);

  return (
    <main className="lp-root min-h-[100dvh] bg-[var(--lp-bg)] px-5 py-24 text-[var(--lp-ink)] sm:px-8">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-[family-name:var(--font-lp-display),serif] text-4xl font-semibold tracking-[-0.03em] sm:text-5xl">
          Join the First Members of the Private Rehearsal Arena
        </h1>

        <section className="mt-12 rounded-[1.75rem] border border-[var(--lp-ink)] bg-[var(--lp-ink)] px-7 py-8 text-[var(--lp-bg)]">
          <p className="text-sm uppercase tracking-[0.2em] text-white/55">
            TalkForge Founding Pass
          </p>

          <div className="mt-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-medium text-white/40 line-through decoration-white/35">
              {compareAt}
            </span>
            <span className="text-4xl font-semibold tracking-tight">
              {amount}
              <span className="text-xl font-medium text-white/70"> / month</span>
            </span>
          </div>
          <p className="mt-3 text-sm font-medium tracking-wide text-[#e0c07a]">
            Lifetime Early Member Rate
          </p>

          <div className="mt-8 max-w-sm">
            {offer.configured ? (
              <MembershipCheckoutButton
                source="pricing_founding"
                label="Claim Your Founding Pass →"
                autoStart={autoStart}
                loginNext="/pricing?checkout=1"
                className="w-full rounded-full bg-[var(--lp-bg)] px-8 py-3.5 text-sm font-semibold text-[var(--lp-ink)] transition hover:opacity-90 disabled:opacity-50"
              />
            ) : (
              <MembershipCheckoutButton
                source="pricing_founding"
                label="Claim Your Founding Pass →"
                disabled
                disabledHint={
                  offer.diagnostics.resolveError
                    ? `Checkout isn’t ready yet: ${offer.diagnostics.resolveError}`
                    : !offer.diagnostics.hasSecretKey
                      ? "Add STRIPE_SECRET_KEY to Vercel Production, then redeploy."
                      : !offer.diagnostics.hasPriceOrProductId
                        ? "Add STRIPE_PRO_PRICE_ID (a price_… or prod_… ID) to Vercel Production, then redeploy."
                        : "Membership checkout is almost ready. Confirm Stripe env vars are set for Production, then redeploy."
                }
                className="w-full rounded-full bg-[var(--lp-bg)] px-8 py-3.5 text-sm font-semibold text-[var(--lp-ink)] transition hover:opacity-90 disabled:opacity-50"
              />
            )}
          </div>

          <p className="mt-6 text-sm leading-6 text-white/55">
            Rate locked for life. No commitments—cancel in one click anytime.
          </p>
        </section>
      </div>
    </main>
  );
}
