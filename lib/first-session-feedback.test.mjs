import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FIRST_SESSION_RATING_TITLE,
  FIRST_SESSION_THANKS_TITLE,
  followUpBandForStars,
  followUpOptionsForBand,
  isValidFollowUpForStars,
  normalizeOptionalComment,
} from "./first-session-feedback.ts";

describe("First session experience rating (IV-UX-010)", () => {
  it("asks the mission question, not a generic app rating", () => {
    assert.match(
      FIRST_SESSION_RATING_TITLE,
      /real communication coach/i
    );
    assert.doesNotMatch(FIRST_SESSION_RATING_TITLE, /TalkForge experience/i);
    assert.match(
      FIRST_SESSION_THANKS_TITLE,
      /world’s best communication coach/i
    );
  });

  it("maps star bands to the right follow-up sets", () => {
    assert.equal(followUpBandForStars(5), "high");
    assert.equal(followUpBandForStars(4), "high");
    assert.equal(followUpBandForStars(3), "mid");
    assert.equal(followUpBandForStars(2), "low");
    assert.equal(followUpBandForStars(1), "low");
    assert.equal(followUpBandForStars(0), null);

    assert.ok(
      followUpOptionsForBand("high").some((o) => o.id === "understood")
    );
    assert.ok(
      followUpOptionsForBand("mid").some((o) => o.id === "better_coaching")
    );
    assert.ok(
      followUpOptionsForBand("low").some((o) => o.id === "technical")
    );
  });

  it("rejects follow-ups from the wrong band and trims optional comments", () => {
    assert.equal(isValidFollowUpForStars(5, "understood"), true);
    assert.equal(isValidFollowUpForStars(5, "technical"), false);
    assert.equal(isValidFollowUpForStars(1, "technical"), true);
    assert.equal(isValidFollowUpForStars(3, "understood"), false);
    assert.equal(normalizeOptionalComment("  hello  "), "hello");
    assert.equal(normalizeOptionalComment("   "), null);
  });
});
