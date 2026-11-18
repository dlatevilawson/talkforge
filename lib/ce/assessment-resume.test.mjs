import assert from "node:assert/strict";
import { test } from "node:test";
import { resumeAssessmentLifecycle } from "./assessment-resume.ts";
import { nextSlot } from "./assessment-lifecycle.ts";

test("resume starts at the next unfilled slot and onboarding minutes prefill practice time", () => {
  const snapshot = {
    version: 1,
    answers: {
      skill_to_improve: "I want to be clearer",
      where_it_shows_up: "Team meetings",
      what_goes_wrong: "I lose my thought",
    },
    filledSlotIds: ["skill_to_improve", "where_it_shows_up", "what_goes_wrong"],
    consented: true,
    sufficient: false,
    practiceSessionId: null,
    completedAt: "2026-11-17T00:00:00.000Z",
  };
  const state = resumeAssessmentLifecycle(snapshot, 10);
  assert.equal(nextSlot(state), "behavior_to_change");
  assert.equal(state.slots.practice_time.answer, "10 minutes each day");
  assert.equal(nextSlot(resumeAssessmentLifecycle(snapshot, null)), "behavior_to_change");
});
