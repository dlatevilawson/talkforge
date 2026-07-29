/**
 * Auth observability — GA4 custom events + structured server logs.
 * Client: trackAuthEvent(). Server: logAuthEvent().
 */

export type AuthAnalyticsEvent =
  | "auth_signup_success"
  | "auth_signup_failure"
  | "auth_login_success"
  | "auth_login_failure"
  | "auth_logout"
  | "auth_verification_success"
  | "auth_verification_failure"
  | "auth_password_reset_request"
  | "auth_password_reset_complete"
  | "auth_session_expired"
  | "auth_error";

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

/** Fire a GA4 custom event when gtag is available (browser only). */
export function trackAuthEvent(
  event: AuthAnalyticsEvent,
  params?: Record<string, string | number | boolean>
): void {
  if (typeof window === "undefined") return;
  try {
    window.gtag?.("event", event, {
      event_category: "authentication",
      ...params,
    });
  } catch {
    // Analytics must never break auth UX
  }
}

/** Structured server log for auth lifecycle (visible in Vercel / runtime logs). */
export function logAuthEvent(
  event: AuthAnalyticsEvent,
  detail?: Record<string, unknown>
): void {
  const payload = {
    source: "tip",
    event,
    at: new Date().toISOString(),
    ...detail,
  };
  if (event.endsWith("_failure") || event === "auth_error") {
    console.warn("[TIP]", JSON.stringify(payload));
  } else {
    console.info("[TIP]", JSON.stringify(payload));
  }
}
