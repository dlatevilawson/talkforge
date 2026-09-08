import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";

import {
  entitlementFromSessionCount,
  hasProAccess,
} from "./access.ts";
import {
  isCompletedInUtcCalendarMonth,
  utcCalendarMonthBounds,
} from "./monthly-sessions.ts";

const entitlementsSource = readFileSync(
  new URL("./entitlements.ts", import.meta.url),
  "utf8"
);

describe("Decision 060 monthly Free entitlement", () => {
  it("allows starts at 0 and 2 completed sessions and denies the next start at 3", () => {
    for (const [count, allowed, remaining] of [
      [0, true, 3],
      [2, true, 1],
      [3, false, 0],
    ]) {
      const result = entitlementFromSessionCount({
        countFailed: false,
        sessionsUsed: count,
        limit: 3,
        status: "free",
      });
      assert.equal(result.canStartPractice, allowed);
      assert.equal(result.sessionsRemaining, remaining);
    }
  });

  it("uses an inclusive UTC month start and exclusive next-month boundary", () => {
    assert.deepEqual(
      utcCalendarMonthBounds(new Date("2026-12-31T23:59:59.999Z")),
      {
        startInclusive: "2026-12-01T00:00:00.000Z",
        endExclusive: "2027-01-01T00:00:00.000Z",
      }
    );
    const now = new Date("2026-09-15T12:00:00.000Z");
    assert.equal(
      isCompletedInUtcCalendarMonth("2026-09-01T00:00:00.000Z", now),
      true
    );
    assert.equal(
      isCompletedInUtcCalendarMonth("2026-10-01T00:00:00.000Z", now),
      false
    );
    assert.equal(
      isCompletedInUtcCalendarMonth("2026-08-31T23:59:59.999Z", now),
      false
    );
  });

  it("rolls the allowance over on the UTC calendar boundary", () => {
    const completion = "2026-09-30T23:59:59.999Z";
    assert.equal(
      isCompletedInUtcCalendarMonth(
        completion,
        new Date("2026-09-30T23:59:59.999Z")
      ),
      true
    );
    assert.equal(
      isCompletedInUtcCalendarMonth(
        completion,
        new Date("2026-10-01T00:00:00.000Z")
      ),
      false
    );
  });

  it("counts only authenticated practice rows, structurally excluding preview rows", () => {
    assert.match(entitlementsSource, /\.from\("practice_sessions"\)/);
    assert.match(entitlementsSource, /\.eq\("user_id", userId\)/);
    assert.match(entitlementsSource, /\.not\("completed_at", "is", null\)/);
    assert.match(entitlementsSource, /\.gte\("completed_at", bounds\.startInclusive\)/);
    assert.match(entitlementsSource, /\.lt\("completed_at", bounds\.endExclusive\)/);
    assert.doesNotMatch(entitlementsSource, /assistant_coach_sessions/);
  });

  it("keeps Pro and staff unlimited", () => {
    assert.equal(hasProAccess(null, "founder"), true);
    assert.equal(hasProAccess(null, "admin"), true);
    assert.equal(
      hasProAccess(
        {
          userId: "pro",
          stripeCustomerId: "cus",
          stripeSubscriptionId: "sub",
          plan: "pro",
          status: "active",
          currentPeriodEnd: null,
          cancelAtPeriodEnd: false,
          canceledAt: null,
          trialEnd: null,
          priceId: "price",
          updatedAt: null,
        },
        "user"
      ),
      true
    );
  });
});
