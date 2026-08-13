/**
 * First-user assessment — generic answers must not fill or advance slots.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { isGenericAssessmentSlotAnswer } from "./assessment-generic-answers.ts";
import {
  acceptAnswer,
  markSlotAsAsking,
  startAssessmentLifecycle,
} from "./assessment-lifecycle.ts";

function consentedAsking(slotId) {
  const started = startAssessmentLifecycle();
  return markSlotAsAsking({ ...started, consented: true }, slotId);
}

test("generic goal answers do not fill or advance skill_to_improve", () => {
  const base = consentedAsking("skill_to_improve");
  for (const text of [
    "I just want to communicate better",
    "I want to be a better communicator overall please",
    "be a better communicator",
    "I don't know what to improve honestly",
    "I just want to speak better overall",
    "I want to be more confident when talking",
    "My issue is not knowing what to say",
  ]) {
    assert.equal(
      isGenericAssessmentSlotAnswer("skill_to_improve", text),
      true,
      text
    );
    const rejected = acceptAnswer(base, text);
    assert.equal(rejected.ok, false, text);
    assert.equal(rejected.reason, "not_sufficient", text);
    assert.equal(rejected.state.slots.skill_to_improve.status, "asking", text);
    assert.equal(rejected.state.slots.skill_to_improve.answer, null, text);
    assert.equal(rejected.state.currentSlot, "skill_to_improve", text);
  }

  const useful = acceptAnswer(
    base,
    "I want to improve small talk and articulation in conversations."
  );
  assert.equal(useful.ok, true);
  assert.equal(useful.state.slots.skill_to_improve.status, "filled");
  assert.equal(useful.state.currentSlot, "where_it_shows_up");
});

test("generic context answers do not fill or advance where_it_shows_up", () => {
  const base = consentedAsking("where_it_shows_up");
  for (const text of [
    "In general, everyday life.",
    "It shows up in everyday life for me mostly",
    "It shows up everywhere for me honestly",
  ]) {
    assert.equal(
      isGenericAssessmentSlotAnswer("where_it_shows_up", text),
      true,
      text
    );
    const rejected = acceptAnswer(base, text);
    assert.equal(rejected.ok, false, text);
    assert.equal(rejected.reason, "not_sufficient", text);
    assert.equal(rejected.state.slots.where_it_shows_up.status, "asking", text);
    assert.equal(rejected.state.slots.where_it_shows_up.answer, null, text);
    assert.equal(rejected.state.currentSlot, "where_it_shows_up", text);
  }

  const useful = acceptAnswer(
    base,
    "Mostly with coworkers in hallway conversations at work."
  );
  assert.equal(useful.ok, true);
  assert.equal(useful.state.slots.where_it_shows_up.status, "filled");
  assert.ok(useful.state.slots.where_it_shows_up.answer?.includes("coworkers"));
  // currentSlot may point at an earlier still-pending slot; fill is what matters.
  assert.notEqual(useful.state.slots.where_it_shows_up.status, "asking");
});

test("practice_time without a duration is rejected", () => {
  const base = consentedAsking("practice_time");
  const rejected = acceptAnswer(base, "Whenever I can find time");
  assert.equal(rejected.ok, false);
  assert.equal(rejected.reason, "not_sufficient");
  const ok = acceptAnswer(base, "About ten minutes each day");
  assert.equal(ok.ok, true);
  assert.equal(ok.state.slots.practice_time.status, "filled");
});

test("generic behavior / example answers stay on the same slot", () => {
  const behavior = consentedAsking("behavior_to_change");
  const badBehavior = acceptAnswer(behavior, "I just want to communicate better");
  assert.equal(badBehavior.ok, false);
  assert.equal(badBehavior.reason, "not_sufficient");
  assert.equal(badBehavior.state.currentSlot, "behavior_to_change");
  assert.equal(badBehavior.state.slots.behavior_to_change.status, "asking");

  const example = consentedAsking("recent_missed_conversation");
  const badExample = acceptAnswer(
    example,
    "I couldn't get my point across in conversations generally"
  );
  assert.equal(badExample.ok, false);
  assert.equal(badExample.reason, "not_sufficient");
  assert.equal(badExample.state.currentSlot, "recent_missed_conversation");
  assert.equal(badExample.state.slots.recent_missed_conversation.status, "asking");
  assert.equal(badExample.state.slots.recent_missed_conversation.answer, null);

  const goodExample = acceptAnswer(
    example,
    "Yesterday my manager asked me a question in a meeting and I couldn't get my point across."
  );
  assert.equal(goodExample.ok, true);
  assert.equal(goodExample.state.slots.recent_missed_conversation.status, "filled");
  // Earlier required slots are still pending, so nextSlot may rewind — the
  // critical check is that a concrete example fills and a generic one does not.
  assert.notEqual(
    goodExample.state.slots.recent_missed_conversation.status,
    "asking"
  );
});
