/**
 * Pure billing access helpers (BILL-001) — unit-testable, no I/O.
 */

import type { BillingPlan, BillingStatus, MemberSubscription } from "@/lib/billing/types";

export const STAFF_ROLES = new Set(["founder", "admin", "system"]);

export const END_OF_FREE_SUPPORTING =
  "Communication improves through consistent practice. Continue training anytime with TalkForge Pro.";

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
