import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countTrailingConfusionAnswers,
  filterSubstantiveAnswers,
  looksLikeProcessConfusion,
} from "./assessment.ts";
import {
  ASSESSMENT_ANCHOR_QUESTIONS,
  ASSESSMENT_CLOSING_LINE,
  ASSESSMENT_DISENGAGEMENT_CHECK_IN,
  buildAssessmentClosingSpeechInstructions,
  buildAssessmentSystemInstructions,
  buildAssessmentTurnInstructions,
} from "../ce/assessment-prompt.ts";

describe("assessment prompt discipline", () => {
  it("forbids mid-assessment restatement and coaching", () => {
    const system = buildAssessmentSystemInstructions();
    assert.match(system, /4–5 words max/i);
    assert.match(system, /NEVER repeat, paraphrase, summarize/i);
    assert.match(
      system,
      /Do not offer to practice, retry, or adjust delivery during assessment mode/
    );
    assert.match(system, /DISENGAGEMENT \/ CONFUSION CHECK/);
    assert.ok(system.includes(ASSESSMENT_DISENGAGEMENT_CHECK_IN));

    const turn = buildAssessmentTurnInstructions();
    assert.match(turn, /Do NOT use reflect→prompt coaching/i);
    assert.match(turn, /max 4–5 words/);
    assert.match(turn, /Never repeat, paraphrase, or summarize/);
    assert.ok(turn.includes(ASSESSMENT_DISENGAGEMENT_CHECK_IN));
  });

  it("keeps conversational anchors, bans practice transition, app owns end", () => {
    const system = buildAssessmentSystemInstructions();
    for (const q of ASSESSMENT_ANCHOR_QUESTIONS) {
      assert.ok(system.includes(q), `missing anchor: ${q}`);
    }
    assert.match(system, /APPLICATION OWNS TERMINATION/i);
    assert.match(system, /NEVER SELF-CLOSE THE ASSESSMENT/i);
    assert.match(system, /master communication coach/i);
    assert.match(system, /mechanical binaries/i);
    assert.match(system, /NO TRANSITION INTO PRACTICE/i);
    assert.match(system, /speaking prompt/i);
    assert.ok(system.includes(ASSESSMENT_CLOSING_LINE));
    assert.match(system, /must contain NO question/i);

    const turn = buildAssessmentTurnInstructions();
    assert.match(turn, /application owns when the assessment ends/i);
    assert.match(turn, /Never ask mechanical binaries/i);
    assert.match(turn, /Never invite a speaking prompt/i);

    const closing = buildAssessmentClosingSpeechInstructions();
    assert.ok(closing.includes(ASSESSMENT_CLOSING_LINE));
    assert.match(closing, /Zero questions/i);
  });
});

describe("assessment confusion gating", () => {
  it("detects process-confusion answers", () => {
    assert.equal(
      looksLikeProcessConfusion("I don’t understand why you’re asking this"),
      true
    );
    assert.equal(
      looksLikeProcessConfusion("not sure what this is for"),
      true
    );
    assert.equal(
      looksLikeProcessConfusion("I freeze in executive updates"),
      false
    );
  });

  it("filters confusion out of substantive answers", () => {
    const texts = [
      "I freeze when presenting to leadership",
      "I don’t understand why you’re asking this",
      "I want to sound calm under pressure",
    ];
    assert.deepEqual(filterSubstantiveAnswers(texts), [
      "I freeze when presenting to leadership",
      "I want to sound calm under pressure",
    ]);
  });

  it("counts trailing consecutive confusion answers", () => {
    assert.equal(
      countTrailingConfusionAnswers([
        "I freeze in meetings",
        "why are you asking this?",
        "not sure what this is for",
      ]),
      2
    );
    assert.equal(
      countTrailingConfusionAnswers([
        "why are you asking this?",
        "I freeze in meetings",
      ]),
      0
    );
  });
});
