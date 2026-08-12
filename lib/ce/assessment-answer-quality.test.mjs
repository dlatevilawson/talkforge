/**
 * Assessment Coach V2 — answer sufficiency classifier (deterministic).
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyAssessmentAnswer,
  isAssessmentAnswerSufficient,
  needsAssessmentClarification,
  synthesizeProfilePhrase,
  containsAdvancedCoachJargon,
} from "./assessment-answer-quality.ts";

test("V2 quality: strong useful answer → sufficient / move forward", () => {
  const text =
    "I want to sound calmer and clearer when I present to leadership at work";
  assert.equal(classifyAssessmentAnswer("skill_to_improve", text), "useful");
  assert.equal(isAssessmentAnswerSufficient("skill_to_improve", text), true);
  assert.equal(needsAssessmentClarification("skill_to_improve", text), false);
});

test("V2 quality: vague answer → needs clarification", () => {
  const text = "I want to communicate better.";
  assert.equal(classifyAssessmentAnswer("skill_to_improve", text), "vague");
  assert.equal(isAssessmentAnswerSufficient("skill_to_improve", text), false);
  assert.equal(needsAssessmentClarification("skill_to_improve", text), true);

  assert.equal(
    classifyAssessmentAnswer("where_it_shows_up", "Everywhere, in general."),
    "vague"
  );
  assert.equal(
    isAssessmentAnswerSufficient("where_it_shows_up", "Everywhere, in general."),
    false
  );
});

test("V2 quality: ambiguous answer → needs clarification", () => {
  const text = "I either freeze or ramble depending, not sure which.";
  assert.equal(classifyAssessmentAnswer("what_goes_wrong", text), "ambiguous");
  assert.equal(isAssessmentAnswerSufficient("what_goes_wrong", text), false);
  assert.equal(needsAssessmentClarification("what_goes_wrong", text), true);
});

test("V2 quality: concrete example → concrete / acceptable", () => {
  const text =
    "Yesterday my manager asked me a question in a meeting and I completely lost my train of thought";
  assert.equal(
    classifyAssessmentAnswer("recent_missed_conversation", text),
    "concrete"
  );
  assert.equal(
    isAssessmentAnswerSufficient("recent_missed_conversation", text),
    true
  );
});

test("V2 quality: off-topic → not sufficient", () => {
  const text = "The weather has been crazy with football season starting";
  assert.equal(classifyAssessmentAnswer("skill_to_improve", text), "off_topic");
  assert.equal(isAssessmentAnswerSufficient("skill_to_improve", text), false);
});

test("V2 quality: practice time needs a real amount", () => {
  assert.equal(
    isAssessmentAnswerSufficient("practice_time", "whenever I can maybe"),
    false
  );
  assert.equal(
    isAssessmentAnswerSufficient("practice_time", "About ten minutes each day"),
    true
  );
});

test("V2 synthesis: polish without inventing facts", () => {
  assert.equal(
    synthesizeProfilePhrase(
      "I want to express my thoughts more clearly and confidently",
      "goal"
    ),
    "Express my thoughts more clearly and confidently"
  );
  assert.equal(
    synthesizeProfilePhrase("I tend to ramble when my boss puts me on the spot", "challenge"),
    "They tend to ramble when my boss puts me on the spot"
  );
  // Must not invent a new event.
  const raw = "I freeze in meetings";
  const polished = synthesizeProfilePhrase(raw, "challenge");
  assert.match(polished, /freeze/i);
  assert.doesNotMatch(polished, /yesterday|manager asked/i);
});

test("V2 jargon: professional terms flagged for spoken questions", () => {
  assert.equal(
    containsAdvancedCoachJargon(
      "How would you characterize your executive presence?"
    ),
    true
  );
  assert.equal(
    containsAdvancedCoachJargon(
      "When you know what you want to say but can't get it out, what usually happens?"
    ),
    false
  );
});
