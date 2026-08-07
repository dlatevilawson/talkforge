import "server-only";

import { getStripe } from "@/lib/billing/stripe";
import {
  getProPriceLabel,
  getStripePriceProMonthly,
  stripeBillingConfigured,
} from "@/lib/billing/config";

export type MembershipOffer = {
  configured: boolean;
  priceId: string | null;
  priceLabel: string;
  productName: string | null;
  currency: string | null;
  unitAmount: number | null;
  interval: string | null;
  source: "env_label" | "stripe" | "fallback";
};

function formatMoney(unitAmount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: unitAmount % 100 === 0 ? 0 : 2,
    }).format(unitAmount / 100);
  } catch {
    return `$${(unitAmount / 100).toFixed(unitAmount % 100 === 0 ? 0 : 2)}`;
  }
}

function formatInterval(interval: string | null | undefined): string {
  if (!interval) return "month";
  if (interval === "year") return "year";
  if (interval === "week") return "week";
  if (interval === "day") return "day";
  return "month";
}

/**
 * Resolve the public Pro / Founding membership offer.
 * Prefers live Stripe Price when secrets are present so Vercel Stripe env
 * alone is enough (NEXT_PUBLIC_BILLING_PRO_PRICE_LABEL optional override).
 */
export async function resolveMembershipOffer(): Promise<MembershipOffer> {
  const explicitLabel = process.env.NEXT_PUBLIC_BILLING_PRO_PRICE_LABEL?.trim();
  const priceId = getStripePriceProMonthly() || null;
  const configured = stripeBillingConfigured();

  if (configured && priceId) {
    try {
      const stripe = getStripe();
      const price = await stripe.prices.retrieve(priceId, {
        expand: ["product"],
      });
      const unitAmount =
        typeof price.unit_amount === "number" ? price.unit_amount : null;
      const currency = price.currency ?? null;
      const interval = price.recurring?.interval ?? null;
      const product = price.product;
      const productName =
        product && typeof product !== "string" && !product.deleted
          ? product.name
          : null;

      const stripeLabel =
        unitAmount != null && currency
          ? `${formatMoney(unitAmount, currency)} / ${formatInterval(interval)}`
          : null;

      return {
        configured: true,
        priceId,
        priceLabel: explicitLabel || stripeLabel || getProPriceLabel(),
        productName,
        currency,
        unitAmount,
        interval,
        source: explicitLabel ? "env_label" : stripeLabel ? "stripe" : "fallback",
      };
    } catch (err) {
      console.warn(
        "[billing] resolveMembershipOffer stripe price failed",
        err instanceof Error ? err.message : err
      );
    }
  }

  return {
    configured,
    priceId,
    priceLabel: getProPriceLabel(),
    productName: null,
    currency: null,
    unitAmount: null,
    interval: null,
    source: explicitLabel ? "env_label" : "fallback",
  };
}
