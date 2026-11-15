import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  HANDS_FREE_ADMISSION_HOLD_MS,
  decideTranscriptAdmission,
  isSubstantiveTranscript,
} from "./transcript-admission.ts";

describe("hands-free transcript admission", () => {
  it("holds substantive speech until local confirmation", () => {
    assert.equal(
      decideTranscriptAdmission({
        text: "I want to explain what happened yesterday",
        locallyConfirmed: false,
      }),
      "hold"
    );
    assert.equal(HANDS_FREE_ADMISSION_HOLD_MS, 1500);
  });

  it("admits the held turn when local confirmation arrives", () => {
    assert.equal(
      decideTranscriptAdmission({
        text: "I want to explain what happened yesterday",
        locallyConfirmed: true,
      }),
      "admit"
    );
  });

  it("drops only short, non-substantive unconfirmed noise", () => {
    assert.equal(
      decideTranscriptAdmission({ text: "uh", locallyConfirmed: false }),
      "drop"
    );
    assert.equal(isSubstantiveTranscript("No"), false);
  });
});

