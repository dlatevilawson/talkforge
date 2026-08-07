import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BECOME_PRO_MEMBER_CTA,
  CANCELLATION_BODY,
  CANCELLATION_HEADLINE,
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
      MAYBE_LATER_CTA,
      MEANINGFUL_PROGRESS_LINE,
      CANCELLATION_HEADLINE,
      ...CANCELLATION_BODY,
    ].join(" ");
    assert.doesNotMatch(
      joined,
      /session limit|usage limit|free quota|api limit|quota/i
    );
  });

  it("frames complimentary coaching and Pro membership calmly", () => {
    assert.match(COMPLIMENTARY_COMPLETE_HEADLINE, /complimentary coaching/i);
    assert.equal(BECOME_PRO_MEMBER_CTA, "Become a Pro Member");
    assert.equal(MAYBE_LATER_CTA, "Maybe Later");
    assert.match(CANCELLATION_HEADLINE, /canceled/i);
    assert.match(CANCELLATION_BODY.join(" "), /welcome back/i);
  });
});
