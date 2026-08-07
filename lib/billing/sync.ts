import "server-only";

import type Stripe from "stripe";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import type { BillingPlan, BillingStatus } from "@/lib/billing/types";
import { logBillingEvent } from "@/lib/billing/analytics";

function unixToIso(seconds: number | null | undefined): string | null {
  if (!seconds || !Number.isFinite(seconds)) return null;
  return new Date(seconds * 1000).toISOString();
}

function planFromStatus(status: BillingStatus): BillingPlan {
  if (
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    (status === "canceled" /* period access handled via dates */)
  ) {
    // canceled may still be within period — plan stays pro until expiry check.
    if (status === "canceled") return "pro";
    return "pro";
  }
  return "free";
}

export function mapStripeSubscriptionStatus(
  status: Stripe.Subscription.Status
): BillingStatus {
  switch (status) {
    case "active":
      return "active";
    case "trialing":
      return "trialing";
    case "past_due":
      return "past_due";
    case "canceled":
      return "canceled";
    case "unpaid":
      return "unpaid";
    case "incomplete":
      return "incomplete";
    case "incomplete_expired":
      return "incomplete_expired";
    case "paused":
      return "paused";
    default:
      return "expired";
  }
}

/** Sync Stripe subscription → member_subscriptions + optional role user↔premium. */
export async function upsertSubscriptionFromStripe(
  userId: string,
  subscription: Stripe.Subscription,
  customerId: string
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const status = mapStripeSubscriptionStatus(subscription.status);
  const rawPeriodEnd =
    (
      subscription as Stripe.Subscription & {
        current_period_end?: number;
      }
    ).current_period_end ??
    (
      subscription.items?.data?.[0] as
        | { current_period_end?: number }
        | undefined
    )?.current_period_end;
  const periodEnd = unixToIso(rawPeriodEnd);
  const priceId =
    subscription.items.data[0]?.price?.id ??
    (typeof subscription.items.data[0]?.price === "string"
      ? subscription.items.data[0]?.price
      : null);

  const stillInPeriod =
    periodEnd != null && new Date(periodEnd).getTime() > Date.now();
  const entitledPro =
    status === "active" ||
    status === "trialing" ||
    status === "past_due" ||
    (status === "canceled" &&
      subscription.cancel_at_period_end &&
      stillInPeriod);

  const plan: BillingPlan = entitledPro ? "pro" : "free";
  const storedStatus: BillingStatus =
    !entitledPro && status === "canceled" ? "expired" : status;

  const { error } = await admin.from("member_subscriptions").upsert(
    {
      user_id: userId,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscription.id,
      plan,
      status: storedStatus,
      current_period_end: periodEnd,
      cancel_at_period_end: Boolean(subscription.cancel_at_period_end),
      canceled_at: unixToIso(subscription.canceled_at),
      trial_end: unixToIso(subscription.trial_end),
      price_id: priceId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new Error(`Failed to upsert membership: ${error.message}`);
  }

  await syncPremiumRole(userId, entitledPro);

  if (storedStatus === "active" || storedStatus === "trialing") {
    logBillingEvent("billing_subscription_activated", {
      userId,
      status: storedStatus,
    });
  }
}

export async function markSubscriptionExpired(userId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  await admin
    .from("member_subscriptions")
    .update({
      plan: "free",
      status: "expired",
      stripe_subscription_id: null,
      cancel_at_period_end: false,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  await syncPremiumRole(userId, false);
}

/** Only toggle user ↔ premium. Never touch founder/admin/system. */
async function syncPremiumRole(
  userId: string,
  entitledPro: boolean
): Promise<void> {
  const admin = createAdminSupabaseClient();
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle();

  const role = typeof profile?.role === "string" ? profile.role : "user";
  if (role === "founder" || role === "admin" || role === "system") {
    return;
  }

  if (entitledPro && role === "user") {
    await admin.from("profiles").update({ role: "premium" }).eq("id", userId);
  } else if (!entitledPro && role === "premium") {
    await admin.from("profiles").update({ role: "user" }).eq("id", userId);
  }
}

export async function ensureFreeMembershipRow(userId: string): Promise<void> {
  const admin = createAdminSupabaseClient();
  await admin.from("member_subscriptions").upsert(
    {
      user_id: userId,
      plan: "free",
      status: "free",
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id", ignoreDuplicates: true }
  );
}

export { planFromStatus };
