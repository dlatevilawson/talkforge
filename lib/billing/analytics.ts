/**
 * Billing analytics — GA4 custom events + structured server logs.
 */

export type BillingAnalyticsEvent =
  | "billing_upgrade_started"
  | "billing_checkout_completed"
  | "billing_subscription_activated"
  | "billing_subscription_canceled"
  | "billing_subscription_renewed"
  | "billing_payment_failed"
  | "billing_portal_opened";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackBillingEvent(
  event: BillingAnalyticsEvent,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", event, {
      event_category: "billing",
      ...params,
    });
  } catch {
    // Analytics must never break billing UX
  }
}

export function logBillingEvent(
  event: BillingAnalyticsEvent,
  detail?: Record<string, unknown>
): void {
  const payload = {
    source: "billing",
    event,
    at: new Date().toISOString(),
    ...detail,
  };
  if (event === "billing_payment_failed") {
    console.warn("[BILLING]", JSON.stringify(payload));
  } else {
    console.info("[BILLING]", JSON.stringify(payload));
  }
}
