import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BECOME_PRO_MEMBER_CTA,
  BILLING_PAGE_COPY,
  CANCELLATION_BODY,
  CANCELLATION_HEADLINE,
  CLAIM_FOUNDING_PASS_CTA,
  COMPLIMENTARY_COMPLETE_BODY,
  COMPLIMENTARY_COMPLETE_HEADLINE,
  MAYBE_LATER_CTA,
  MEANINGFUL_PROGRESS_LINE,
} from "./member-copy.ts";

describe("member-facing billing copy", () => {
  it("never exposes technical quota language", () => {
    const joined = [
      COMPLIMENTARY_COMPLETE_HEADLINE,
      ...COMPLIMENTARY_COMPLETE_BODY,
      BECOME_PRO_MEMBER_CTA,
      CLAIM_FOUNDING_PASS_CTA,
      MAYBE_LATER_CTA,
      MEANINGFUL_PROGRESS_LINE,
      CANCELLATION_HEADLINE,
      ...CANCELLATION_BODY,
      BILLING_PAGE_COPY.header.title,
      BILLING_PAGE_COPY.proPlan.description,
    ].join(" ");
    assert.doesNotMatch(
      joined,
      /session limit|usage limit|free quota|api limit|quota/i
    );
  });

  it("frames complimentary coaching and Founding Pass calmly", () => {
    assert.match(COMPLIMENTARY_COMPLETE_HEADLINE, /complimentary coaching/i);
    assert.equal(CLAIM_FOUNDING_PASS_CTA, "Claim Your Founding Pass →");
    assert.equal(MAYBE_LATER_CTA, "Maybe Later");
    assert.equal(BILLING_PAGE_COPY.currentPlan.title, "TalkForge Explorer");
    assert.equal(BILLING_PAGE_COPY.proPlan.price, "$19.99");
    assert.match(CANCELLATION_HEADLINE, /canceled/i);
    assert.match(CANCELLATION_BODY.join(" "), /welcome back/i);
  });
});
