import "server-only";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { adminConfigured } from "@/lib/supabase/admin";
import {
  END_OF_FREE_SUPPORTING,
  STAFF_ROLES,
  freeSessionsRemaining,
  hasProAccess,
} from "@/lib/billing/access";
import { getBillingFreeLimits, getProPriceLabel, stripeBillingConfigured } from "@/lib/billing/config";
import { ensureFreeMembershipRow } from "@/lib/billing/sync";
import type {
  BillingPlan,
  BillingStatus,
  MemberSubscription,
  MembershipView,
  PracticeEntitlement,
} from "@/lib/billing/types";

function mapRow(row: Record<string, unknown> | null): MemberSubscription | null {
  if (!row || typeof row.user_id !== "string") return null;
  return {
    userId: row.user_id,
    stripeCustomerId:
      typeof row.stripe_customer_id === "string" ? row.stripe_customer_id : null,
    stripeSubscriptionId:
      typeof row.stripe_subscription_id === "string"
        ? row.stripe_subscription_id
        : null,
    plan: row.plan === "pro" ? "pro" : "free",
    status: (typeof row.status === "string"
      ? row.status
      : "free") as BillingStatus,
    currentPeriodEnd:
      typeof row.current_period_end === "string" ? row.current_period_end : null,
    cancelAtPeriodEnd: Boolean(row.cancel_at_period_end),
    canceledAt: typeof row.canceled_at === "string" ? row.canceled_at : null,
    trialEnd: typeof row.trial_end === "string" ? row.trial_end : null,
    priceId: typeof row.price_id === "string" ? row.price_id : null,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}

async function countCompletedSessions(
  userId: string,
  monthlyOnly: boolean
): Promise<number> {
  const supabase = await createServerSupabaseClient();
  let query = supabase
    .from("practice_sessions")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .not("completed_at", "is", null);

  if (monthlyOnly) {
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    query = query.gte("completed_at", start.toISOString());
  }

  const { count, error } = await query;
  if (error) {
    console.warn("[billing] session count failed", error.message);
    return 0;
  }
  return count ?? 0;
}

export async function loadMemberSubscription(
  userId: string
): Promise<MemberSubscription | null> {
  const supabase = await createServerSupabaseClient();
  const { data, error } = await supabase
    .from("member_subscriptions")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (
      error.code === "42P01" ||
      /does not exist|schema cache/i.test(error.message)
    ) {
      return null;
    }
    console.warn("[billing] load membership", error.message);
    return null;
  }

  if (!data && adminConfigured()) {
    try {
      await ensureFreeMembershipRow(userId);
    } catch {
      // Table may not be migrated yet.
    }
  }

  return mapRow(data as Record<string, unknown> | null);
}

export async function evaluatePracticeEntitlement(
  userId: string,
  role?: string | null
): Promise<PracticeEntitlement> {
  const limits = getBillingFreeLimits();
  let resolvedRole = role ?? null;

  if (!resolvedRole) {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    resolvedRole = typeof data?.role === "string" ? data.role : null;
  }

  if (resolvedRole && STAFF_ROLES.has(resolvedRole)) {
    return {
      canStartPractice: true,
      plan: "pro",
      status: "active",
      reason: "staff",
      sessionsUsed: 0,
      sessionsLimit: null,
      sessionsRemaining: null,
      message: null,
    };
  }

  const sub = await loadMemberSubscription(userId);
  if (hasProAccess(sub, resolvedRole)) {
    return {
      canStartPractice: true,
      plan: "pro",
      status: sub?.status ?? "active",
      reason: "pro",
      sessionsUsed: 0,
      sessionsLimit: null,
      sessionsRemaining: null,
      message: null,
    };
  }

  const sessionsUsed = await countCompletedSessions(
    userId,
    limits.monthlyLimitEnabled
  );
  const limit = limits.monthlyLimitEnabled
    ? limits.monthlyMaxSessions
    : limits.maxPracticeSessions;
  const remaining = freeSessionsRemaining(sessionsUsed, limit);

  if (remaining > 0) {
    return {
      canStartPractice: true,
      plan: "free",
      status: sub?.status ?? "free",
      reason: "free_remaining",
      sessionsUsed,
      sessionsLimit: limit,
      sessionsRemaining: remaining,
      message: null,
    };
  }

  return {
    canStartPractice: false,
    plan: "free",
    status: sub?.status ?? "free",
    reason: "free_limit_reached",
    sessionsUsed,
    sessionsLimit: limit,
    sessionsRemaining: 0,
    message: END_OF_FREE_SUPPORTING,
  };
}

function statusLabel(status: BillingStatus, plan: BillingPlan): string {
  if (plan === "free" || status === "free" || status === "expired") {
    return "Free";
  }
  switch (status) {
    case "active":
      return "Active";
    case "trialing":
      return "Trial";
    case "past_due":
      return "Payment needs attention";
    case "canceled":
      return "Access continues until period ends";
    case "unpaid":
      return "Payment needs attention";
    case "incomplete":
    case "incomplete_expired":
      return "Membership checkout incomplete";
    case "paused":
      return "Paused";
    default:
      return status;
  }
}

function renewalLabel(sub: MemberSubscription | null): string | null {
  if (!sub?.currentPeriodEnd) return null;
  const date = new Date(sub.currentPeriodEnd);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  if (sub.cancelAtPeriodEnd || sub.status === "canceled") {
    return `Full access through ${formatted}`;
  }
  if (sub.status === "past_due") {
    return `Please update payment · next attempt around ${formatted}`;
  }
  if (sub.status === "trialing") {
    return `Trial access through ${formatted}`;
  }
  return `Renews ${formatted}`;
}

export async function buildMembershipView(
  userId: string,
  role?: string | null
): Promise<MembershipView> {
  const limits = getBillingFreeLimits();
  const sub = await loadMemberSubscription(userId);
  const entitlement = await evaluatePracticeEntitlement(userId, role);
  const plan: BillingPlan = entitlement.plan;
  const status: BillingStatus = entitlement.status;
  const proAccess = plan === "pro";

  return {
    plan,
    status,
    statusLabel: statusLabel(status, plan),
    renewalLabel: renewalLabel(sub),
    billingCycle: proAccess ? "Monthly" : null,
    cancelAtPeriodEnd: Boolean(sub?.cancelAtPeriodEnd),
    canUpgrade: !proAccess,
    canManage: Boolean(sub?.stripeCustomerId),
    proPriceLabel: getProPriceLabel(),
    freeLimits: {
      maxPracticeSessions: limits.maxPracticeSessions,
      maxSessionSeconds: limits.maxSessionSeconds,
    },
    entitlement,
    stripeConfigured: stripeBillingConfigured(),
  };
}
