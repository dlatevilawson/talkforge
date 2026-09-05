/**
 * Pure billing access helpers (BILL-001) — unit-testable, no I/O.
 */

import type {
  BillingPlan,
  BillingStatus,
  MemberSubscription,
  PracticeEntitlement,
} from "@/lib/billing/types";

export const STAFF_ROLES = new Set(["founder", "admin", "system"]);

/** Supporting lines after complimentary coaching is complete (member-facing). */
export const END_OF_FREE_SUPPORTING =
  "Communication isn’t mastered in a single conversation. It’s built through consistent, deliberate practice. Whenever you’re ready, Forge will be here.";

/** When session count cannot be read — fail closed, never invent remaining sessions. */
export const BILLING_UNAVAILABLE_SUPPORTING =
  "Training isn’t available right now. Try again in a moment.";

export function entitlementFromSessionCount(input: {
  countFailed: boolean;
  sessionsUsed: number;
  limit: number;
  status: BillingStatus;
}): PracticeEntitlement {
  if (input.countFailed) {
    return {
      canStartPractice: false,
      plan: "free",
      status: input.status,
      reason: "billing_unavailable",
      sessionsUsed: 0,
      sessionsLimit: null,
      sessionsRemaining: null,
      message: BILLING_UNAVAILABLE_SUPPORTING,
    };
  }

  const remaining = freeSessionsRemaining(input.sessionsUsed, input.limit);
  if (remaining > 0) {
    return {
      canStartPractice: true,
      plan: "free",
      status: input.status,
      reason: "free_remaining",
      sessionsUsed: input.sessionsUsed,
      sessionsLimit: input.limit,
      sessionsRemaining: remaining,
      message: null,
    };
  }

  return {
    canStartPractice: false,
    plan: "free",
    status: input.status,
    reason: "free_limit_reached",
    sessionsUsed: input.sessionsUsed,
    sessionsLimit: input.limit,
    sessionsRemaining: 0,
    message: END_OF_FREE_SUPPORTING,
  };
}

export function hasProAccess(
  sub: MemberSubscription | null,
  role: string | null | undefined,
  nowMs: number = Date.now()
): boolean {
  if (role && STAFF_ROLES.has(role)) return true;
  if (!sub) return false;
  if (
    sub.status === "active" ||
    sub.status === "trialing" ||
    sub.status === "past_due"
  ) {
    return true;
  }
  // Canceled / cancel-at-period-end: keep Pro only while the paid period remains.
  if (sub.status === "canceled" || sub.cancelAtPeriodEnd) {
    return Boolean(
      sub.currentPeriodEnd &&
        new Date(sub.currentPeriodEnd).getTime() > nowMs
    );
  }
  return false;
}

export function freeSessionsRemaining(
  sessionsUsed: number,
  limit: number
): number {
  return Math.max(0, limit - sessionsUsed);
}

export function resolveDisplayPlan(
  entitledPro: boolean,
  status: BillingStatus
): BillingPlan {
  if (entitledPro) return "pro";
  if (status === "expired" || status === "free") return "free";
  return "free";
}
