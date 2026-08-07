/**
 * BILL-001 — configurable Free limits and Stripe price display.
 * Change via env; do not hard-code product limits in UI/gate logic.
 */

function intEnv(name: string, fallback: number): number {
  const raw = process.env[name]?.trim();
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

function boolEnv(name: string, fallback: boolean): boolean {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return fallback;
  if (raw === "1" || raw === "true" || raw === "yes") return true;
  if (raw === "0" || raw === "false" || raw === "no") return false;
  return fallback;
}

/** Strip quotes/whitespace that Vercel paste sometimes includes. */
function cleanEnv(raw: string | undefined): string {
  if (!raw) return "";
  return raw.trim().replace(/^['"]|['"]$/g, "").trim();
}

export function getBillingFreeLimits() {
  return {
    maxPracticeSessions: intEnv("BILLING_FREE_MAX_SESSIONS", 3),
    maxSessionSeconds: intEnv("BILLING_FREE_MAX_SESSION_SECONDS", 900),
    monthlyLimitEnabled: boolEnv("BILLING_FREE_MONTHLY_LIMIT_ENABLED", false),
    monthlyMaxSessions: intEnv("BILLING_FREE_MONTHLY_MAX_SESSIONS", 3),
  };
}

export function getProPriceLabel(): string {
  return (
    cleanEnv(process.env.NEXT_PUBLIC_BILLING_PRO_PRICE_LABEL) || "$29 / month"
  );
}

/**
 * Raw Stripe Price or Product ID from env.
 * TalkForge Vercel currently uses STRIPE_PRO_PRICE_ID (may be price_ or prod_).
 */
export function getStripePriceOrProductId(): string {
  const candidates = [
    process.env.STRIPE_PRO_PRICE_ID,
    process.env.STRIPE_PRICE_PRO_MONTHLY,
    process.env.STRIPE_PRICE_ID,
    process.env.STRIPE_PRICE_PRO,
    process.env.STRIPE_PRODUCT_ID,
    process.env.STRIPE_PRO_PRODUCT_ID,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
  ];
  for (const raw of candidates) {
    const value = cleanEnv(raw);
    if (value) return value;
  }
  return "";
}

/** @deprecated Prefer getStripePriceOrProductId — kept for call sites. */
export function getStripePriceProMonthly(): string {
  return getStripePriceOrProductId();
}

export function stripeSecretConfigured(): boolean {
  return Boolean(cleanEnv(process.env.STRIPE_SECRET_KEY));
}

export function stripeBillingConfigured(): boolean {
  return Boolean(stripeSecretConfigured() && getStripePriceOrProductId());
}

export function stripeWebhookConfigured(): boolean {
  return Boolean(cleanEnv(process.env.STRIPE_WEBHOOK_SECRET));
}
