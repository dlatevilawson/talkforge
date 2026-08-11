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
  containsBannedAssessmentQuestionLanguage,
  countQuestionMarks,
  looksLikeDoubleBarreledAssessmentQuestion,
} from "../ce/assessment-prompt.ts";

describe("assessment prompt discipline", () => {
  it("forbids mid-assessment therapy mirroring and coaching", () => {
    const system = buildAssessmentSystemInstructions();
    assert.match(system, /SLOT IS THE DESTINATION, NOT THE SCRIPT/i);
    assert.doesNotMatch(system, /NEVER repeat, paraphrase, summarize/i);
    assert.doesNotMatch(system, /ACK ≤5 words/i);
    assert.match(system, /NO MID-ASSESSMENT COACHING/i);
    assert.ok(system.includes(ASSESSMENT_DISENGAGEMENT_CHECK_IN));

    const turn = buildAssessmentTurnInstructions("skill_to_improve");
    assert.match(turn, /FORBIDDEN: long reflect→prompt therapy coaching/i);
    assert.match(turn, /Brief acknowledgment that uses what they said/i);
    assert.ok(turn.includes(ASSESSMENT_DISENGAGEMENT_CHECK_IN));
    assert.match(turn, /id: skill_to_improve/);
  });

  it("enforces one concrete question per turn in system + turn prompts", () => {
    const system = buildAssessmentSystemInstructions();
    assert.match(system, /ONE QUESTION PER TURN/i);
    assert.match(system, /Exactly one question mark/i);
    assert.match(system, /Never combine two asks/i);
    assert.match(system, /communication behavior/i); // banned by name
    assert.match(system, /Bad \(forbidden\).*and where/i);
    assert.match(system, /APPLICATION OWNS SLOT SELECTION/i);
    assert.match(system, /Do NOT choose which slot to ask next/i);
    assert.doesNotMatch(system, /ADAPTIVE DIAGNOSIS/i);
    assert.doesNotMatch(system, /Choose the next missing slot/i);

    const turn = buildAssessmentTurnInstructions("skill_to_improve");
    assert.match(turn, /Exactly ONE concrete diagnostic question/i);
    assert.match(turn, /one question mark/i);
    assert.match(turn, /CURRENT ASSESSMENT SLOT/i);
    assert.match(turn, /id: skill_to_improve/);
    assert.doesNotMatch(turn, /Pick the next uncovered diagnostic slot/i);
    assert.match(turn, /FORBIDDEN: two questions/i);
    assert.match(turn, /communication behavior/i);
  });

  it("keeps concrete diagnostic anchors and bans therapy-style framing", () => {
    const system = buildAssessmentSystemInstructions();
    for (const q of ASSESSMENT_ANCHOR_QUESTIONS) {
      assert.ok(system.includes(q), `missing anchor: ${q}`);
      assert.equal(
        countQuestionMarks(q),
        1,
        `anchor must be one question: ${q}`
      );
      assert.equal(
        looksLikeDoubleBarreledAssessmentQuestion(q),
        false,
        `anchor must not be double-barreled: ${q}`
      );
      assert.equal(
        containsBannedAssessmentQuestionLanguage(q),
        false,
        `anchor must not use banned language: ${q}`
      );
    }
    assert.match(system, /APPLICATION OWNS TERMINATION/i);
    assert.match(system, /NEVER SELF-CLOSE/i);
    assert.match(system, /NOT therapy/i);
    assert.ok(system.includes(ASSESSMENT_CLOSING_LINE));
    assert.doesNotMatch(system, /what.?s at stake for them/i);

    const turn = buildAssessmentTurnInstructions("where_it_shows_up");
    assert.match(turn, /app owns when the assessment ends/i);
    assert.match(turn, /Exactly ONE concrete diagnostic question/i);
    assert.match(turn, /id: where_it_shows_up/);
    assert.doesNotMatch(turn, /desired identity/i);

    const closing = buildAssessmentClosingSpeechInstructions();
    assert.ok(closing.includes(ASSESSMENT_CLOSING_LINE));
    assert.match(closing, /Zero questions/i);
  });

  it("example anchors are performance-diagnostic, not emotional", () => {
    const joined = ASSESSMENT_ANCHOR_QUESTIONS.join("\n").toLowerCase();
    assert.match(joined, /get better at when you speak/);
    assert.match(joined, /practice each day/);
    assert.match(joined, /recent conversation/);
    assert.doesNotMatch(joined, /feel more confident/);
    assert.doesNotMatch(joined, /really counts/);
    assert.doesNotMatch(joined, /matter most/);
    assert.doesNotMatch(joined, /communication behavior/);
    assert.doesNotMatch(joined, /social situations, family, or presentations/);
  });
});

describe("one-question-per-turn classifiers", () => {
  it("flags the exact double-barreled QA failure mode", () => {
    const bad =
      "Got it. What's the one communication behavior you most want to improve when you're speaking, and where does it show up most?";
    assert.equal(countQuestionMarks(bad), 1);
    assert.equal(looksLikeDoubleBarreledAssessmentQuestion(bad), true);
    assert.equal(containsBannedAssessmentQuestionLanguage(bad), true);
  });

  it("allows a single concrete coach question", () => {
    const good =
      "Got it. What would you most like to get better at when you speak?";
    assert.equal(countQuestionMarks(good), 1);
    assert.equal(looksLikeDoubleBarreledAssessmentQuestion(good), false);
    assert.equal(containsBannedAssessmentQuestionLanguage(good), false);
  });

  it("flags two question marks in one turn", () => {
    const stacked =
      "Okay. What do you want to improve? Where does that show up?";
    assert.equal(countQuestionMarks(stacked), 2);
    assert.equal(looksLikeDoubleBarreledAssessmentQuestion(stacked), true);
  });

  it("every published anchor is a valid single question", () => {
    for (const q of ASSESSMENT_ANCHOR_QUESTIONS) {
      assert.equal(countQuestionMarks(q), 1);
      assert.equal(looksLikeDoubleBarreledAssessmentQuestion(q), false);
      assert.equal(containsBannedAssessmentQuestionLanguage(q), false);
    }
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
