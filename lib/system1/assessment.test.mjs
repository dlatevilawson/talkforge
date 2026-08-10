import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  countTrailingConfusionAnswers,
  filterSubstantiveAnswers,
  looksLikeProcessConfusion,
} from "./assessment.ts";
import {
  buildAssessmentSystemInstructions,
  buildAssessmentTurnInstructions,
  ASSESSMENT_DISENGAGEMENT_CHECK_IN,
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
