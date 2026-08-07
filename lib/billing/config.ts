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
    process.env.NEXT_PUBLIC_BILLING_PRO_PRICE_LABEL?.trim() || "$29 / month"
  );
}

/**
 * Pro monthly Price ID. Accepts common Vercel naming aliases so a created
 * Stripe Price still wires when the env key isn’t exactly STRIPE_PRICE_PRO_MONTHLY.
 */
export function getStripePriceProMonthly(): string {
  const candidates = [
    process.env.STRIPE_PRICE_PRO_MONTHLY,
    process.env.STRIPE_PRICE_ID,
    process.env.STRIPE_PRO_PRICE_ID,
    process.env.STRIPE_PRICE_PRO,
    process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY,
  ];
  for (const raw of candidates) {
    const value = raw?.trim();
    if (value) return value;
  }
  return "";
}

export function stripeBillingConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && getStripePriceProMonthly()
  );
}

export function stripeWebhookConfigured(): boolean {
  return Boolean(process.env.STRIPE_WEBHOOK_SECRET?.trim());
}
