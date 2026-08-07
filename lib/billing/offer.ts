import "server-only";

import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import {
  getProPriceLabel,
  getStripePriceOrProductId,
  stripeBillingConfigured,
  stripeSecretConfigured,
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
  /** Non-sensitive diagnostics for the pricing UI / status route. */
  diagnostics: {
    hasSecretKey: boolean;
    hasPriceOrProductId: boolean;
    idKind: "price" | "product" | "unknown" | "missing";
    resolveError: string | null;
  };
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

function idKindOf(id: string | null): MembershipOffer["diagnostics"]["idKind"] {
  if (!id) return "missing";
  if (id.startsWith("price_")) return "price";
  if (id.startsWith("prod_")) return "product";
  return "unknown";
}

function offerFromPrice(
  price: Stripe.Price,
  explicitLabel: string | undefined,
  diagnostics: MembershipOffer["diagnostics"]
): MembershipOffer {
  const unitAmount =
    typeof price.unit_amount === "number" ? price.unit_amount : null;
  const currency = price.currency ?? null;
  const interval = price.recurring?.interval ?? null;
  const product = price.product;
  const productName =
    product && typeof product !== "string" && !("deleted" in product && product.deleted)
      ? product.name
      : null;

  const stripeLabel =
    unitAmount != null && currency
      ? `${formatMoney(unitAmount, currency)} / ${formatInterval(interval)}`
      : null;

  return {
    configured: true,
    priceId: price.id,
    priceLabel: explicitLabel || stripeLabel || getProPriceLabel(),
    productName,
    currency,
    unitAmount,
    interval,
    source: explicitLabel ? "env_label" : stripeLabel ? "stripe" : "fallback",
    diagnostics,
  };
}

/**
 * Resolve env Price ID or Product ID → active recurring Price.
 * Supports Vercel `STRIPE_PRO_PRICE_ID` whether it holds price_… or prod_….
 */
export async function resolveStripePriceId(): Promise<{
  priceId: string | null;
  error: string | null;
}> {
  const raw = getStripePriceOrProductId();
  if (!raw) {
    return { priceId: null, error: "Missing STRIPE_PRO_PRICE_ID (or STRIPE_PRICE_PRO_MONTHLY)." };
  }
  if (!stripeSecretConfigured()) {
    return { priceId: null, error: "Missing STRIPE_SECRET_KEY." };
  }

  try {
    const stripe = getStripe();

    if (raw.startsWith("price_")) {
      const price = await stripe.prices.retrieve(raw);
      if (!price.active) {
        return { priceId: null, error: "Stripe Price exists but is inactive." };
      }
      return { priceId: price.id, error: null };
    }

    if (raw.startsWith("prod_")) {
      const prices = await stripe.prices.list({
        product: raw,
        active: true,
        limit: 20,
      });
      const monthly =
        prices.data.find(
          (p) => p.recurring?.interval === "month" && p.type === "recurring"
        ) ??
        prices.data.find((p) => p.type === "recurring") ??
        prices.data[0];
      if (!monthly) {
        return {
          priceId: null,
          error:
            "STRIPE_PRO_PRICE_ID looks like a Product ID, but no active Price was found on that product.",
        };
      }
      return { priceId: monthly.id, error: null };
    }

    // Unknown prefix — try as price, then product.
    try {
      const price = await stripe.prices.retrieve(raw);
      return { priceId: price.id, error: null };
    } catch {
      const prices = await stripe.prices.list({
        product: raw,
        active: true,
        limit: 20,
      });
      const monthly =
        prices.data.find((p) => p.recurring?.interval === "month") ??
        prices.data[0];
      if (!monthly) {
        return {
          priceId: null,
          error: `Could not resolve “${raw.slice(0, 12)}…” as a Stripe Price or Product.`,
        };
      }
      return { priceId: monthly.id, error: null };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe lookup failed.";
    return { priceId: null, error: message };
  }
}

/**
 * Resolve the public Pro / Founding membership offer.
 * Prefers live Stripe Price when secrets are present so Vercel Stripe env
 * alone is enough (NEXT_PUBLIC_BILLING_PRO_PRICE_LABEL optional override).
 */
export async function resolveMembershipOffer(): Promise<MembershipOffer> {
  const explicitLabel = process.env.NEXT_PUBLIC_BILLING_PRO_PRICE_LABEL?.trim();
  const rawId = getStripePriceOrProductId() || null;
  const configured = stripeBillingConfigured();
  const baseDiagnostics: MembershipOffer["diagnostics"] = {
    hasSecretKey: stripeSecretConfigured(),
    hasPriceOrProductId: Boolean(rawId),
    idKind: idKindOf(rawId),
    resolveError: null,
  };

  if (!configured) {
    return {
      configured: false,
      priceId: null,
      priceLabel: getProPriceLabel(),
      productName: null,
      currency: null,
      unitAmount: null,
      interval: null,
      source: explicitLabel ? "env_label" : "fallback",
      diagnostics: baseDiagnostics,
    };
  }

  const resolved = await resolveStripePriceId();
  if (!resolved.priceId) {
    return {
      configured: false,
      priceId: null,
      priceLabel: getProPriceLabel(),
      productName: null,
      currency: null,
      unitAmount: null,
      interval: null,
      source: explicitLabel ? "env_label" : "fallback",
      diagnostics: {
        ...baseDiagnostics,
        resolveError: resolved.error,
      },
    };
  }

  try {
    const stripe = getStripe();
    const price = await stripe.prices.retrieve(resolved.priceId, {
      expand: ["product"],
    });
    return offerFromPrice(price, explicitLabel || undefined, {
      ...baseDiagnostics,
      idKind: idKindOf(rawId),
      resolveError: null,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Stripe price retrieve failed.";
    console.warn("[billing] resolveMembershipOffer", message);
    return {
      configured: false,
      priceId: resolved.priceId,
      priceLabel: getProPriceLabel(),
      productName: null,
      currency: null,
      unitAmount: null,
      interval: null,
      source: explicitLabel ? "env_label" : "fallback",
      diagnostics: {
        ...baseDiagnostics,
        resolveError: message,
      },
    };
  }
}
