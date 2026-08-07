import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  END_OF_FREE_SUPPORTING,
  freeSessionsRemaining,
  hasProAccess,
  resolveDisplayPlan,
} from "./access.ts";

describe("billing access (BILL-001)", () => {
  it("grants staff Pro regardless of subscription row", () => {
    assert.equal(hasProAccess(null, "founder"), true);
    assert.equal(hasProAccess(null, "admin"), true);
    assert.equal(hasProAccess(null, "user"), false);
  });

  it("grants Pro for active, trialing, and past_due", () => {
    const base = {
      userId: "u1",
      stripeCustomerId: "cus_x",
      stripeSubscriptionId: "sub_x",
      plan: "pro",
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
      canceledAt: null,
      trialEnd: null,
      priceId: "price_x",
      updatedAt: null,
    };
    assert.equal(hasProAccess({ ...base, status: "active" }, "user"), true);
    assert.equal(hasProAccess({ ...base, status: "trialing" }, "user"), true);
    assert.equal(hasProAccess({ ...base, status: "past_due" }, "user"), true);
  });

  it("keeps canceled Pro access until period end", () => {
    const future = new Date(Date.now() + 86_400_000).toISOString();
    const past = new Date(Date.now() - 86_400_000).toISOString();
    const base = {
      userId: "u1",
      stripeCustomerId: "cus_x",
      stripeSubscriptionId: "sub_x",
      plan: "pro",
      status: "canceled",
      cancelAtPeriodEnd: true,
      canceledAt: null,
      trialEnd: null,
      priceId: "price_x",
      updatedAt: null,
    };
    assert.equal(
      hasProAccess({ ...base, currentPeriodEnd: future }, "user"),
      true
    );
    assert.equal(
      hasProAccess({ ...base, currentPeriodEnd: past }, "user"),
      false
    );
  });

  it("computes free remaining without going negative", () => {
    assert.equal(freeSessionsRemaining(0, 3), 3);
    assert.equal(freeSessionsRemaining(3, 3), 0);
    assert.equal(freeSessionsRemaining(5, 3), 0);
  });

  it("keeps end-of-free copy calm and non-blocking", () => {
    assert.match(END_OF_FREE_SUPPORTING, /consistent practice/i);
    assert.match(END_OF_FREE_SUPPORTING, /TalkForge Pro/);
    assert.doesNotMatch(END_OF_FREE_SUPPORTING, /hurry|limited time|last chance/i);
  });

  it("maps non-entitled states to Free display plan", () => {
    assert.equal(resolveDisplayPlan(true, "active"), "pro");
    assert.equal(resolveDisplayPlan(false, "expired"), "free");
    assert.equal(resolveDisplayPlan(false, "free"), "free");
  });
});
