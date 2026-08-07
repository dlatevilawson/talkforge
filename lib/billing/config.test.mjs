import assert from "node:assert/strict";
import { describe, it, beforeEach, afterEach } from "node:test";
import {
  getBillingFreeLimits,
  getProPriceLabel,
  getStripePriceProMonthly,
} from "./config.ts";

describe("billing config (env-driven limits)", () => {
  const keys = [
    "BILLING_FREE_MAX_SESSIONS",
    "BILLING_FREE_MAX_SESSION_SECONDS",
    "BILLING_FREE_MONTHLY_LIMIT_ENABLED",
    "BILLING_FREE_MONTHLY_MAX_SESSIONS",
    "NEXT_PUBLIC_BILLING_PRO_PRICE_LABEL",
    "STRIPE_PRICE_PRO_MONTHLY",
    "STRIPE_PRICE_ID",
    "STRIPE_PRO_PRICE_ID",
    "STRIPE_PRICE_PRO",
    "NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY",
  ];
  /** @type {Record<string, string | undefined>} */
  const previous = {};

  beforeEach(() => {
    for (const key of keys) {
      previous[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of keys) {
      if (previous[key] === undefined) delete process.env[key];
      else process.env[key] = previous[key];
    }
  });

  it("defaults free limits without hard-coding in callers", () => {
    const limits = getBillingFreeLimits();
    assert.equal(limits.maxPracticeSessions, 3);
    assert.equal(limits.maxSessionSeconds, 900);
    assert.equal(limits.monthlyLimitEnabled, false);
    assert.equal(limits.monthlyMaxSessions, 3);
  });

  it("reads free limits from environment", () => {
    process.env.BILLING_FREE_MAX_SESSIONS = "5";
    process.env.BILLING_FREE_MAX_SESSION_SECONDS = "1200";
    process.env.BILLING_FREE_MONTHLY_LIMIT_ENABLED = "true";
    process.env.BILLING_FREE_MONTHLY_MAX_SESSIONS = "8";
    const limits = getBillingFreeLimits();
    assert.equal(limits.maxPracticeSessions, 5);
    assert.equal(limits.maxSessionSeconds, 1200);
    assert.equal(limits.monthlyLimitEnabled, true);
    assert.equal(limits.monthlyMaxSessions, 8);
  });

  it("reads Pro price label from public env with fallback", () => {
    assert.equal(getProPriceLabel(), "$29 / month");
    process.env.NEXT_PUBLIC_BILLING_PRO_PRICE_LABEL = "$39 / month";
    assert.equal(getProPriceLabel(), "$39 / month");
  });

  it("resolves Stripe price id from common env aliases", () => {
    process.env.STRIPE_PRICE_ID = "price_alias_123";
    assert.equal(getStripePriceProMonthly(), "price_alias_123");
  });
});
