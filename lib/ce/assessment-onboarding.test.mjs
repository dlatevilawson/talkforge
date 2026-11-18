import assert from "node:assert/strict";
import { test } from "node:test";
import { ASSESSMENT_ANCHOR_QUESTIONS } from "./assessment-prompt.ts";

test("bottleneck slot asks for one recent story without changing the frozen slot catalog", () => {
  assert.equal(ASSESSMENT_ANCHOR_QUESTIONS[2], "Tell me about a recent time communication went wrong. What happened?");
  assert.equal(ASSESSMENT_ANCHOR_QUESTIONS.length, 7);
});
