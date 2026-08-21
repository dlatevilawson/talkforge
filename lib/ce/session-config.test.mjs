/**
 * Coach confirm → first Forge practice: start the named conversation.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { AC_HANDOFF_SOURCE } from "../assistant-coach/confirmation.ts";
import { buildOpeningSpeechInstructions } from "../coach/philosophy.ts";
import {
  AC_PRACTICE_HANDOFF_SOURCE,
  applyConfirmedPracticeHandoff,
  buildAcPracticeObjectiveLines,
  isAcPracticeHandoff,
} from "./ac-practice-handoff.ts";

const FRIENDS_MOMENT = "Starting a conversation with a friend";
const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

function returningMemory() {
  return {
    firstName: "AC",
    nickname: "",
    isReturning: true,
    sessionsCompleted: 3,
    lastScenarioTitle: "Land the revenue answer",
    lastSessionSummary: "Rushed the revenue close.",
    lastSessionAt: "2026-08-18T12:00:00.000Z",
    recentWins: [],
    topicsWorkingOn: ["revenue answer"],
    communicationGoals: ["interview"],
    longTermChallenges: [],
    biggestFears: [],
    emotionalTriggers: [],
    preferredCoachingStyle: "",
    learningStyle: "",
    confidenceLevel: null,
    biggestStrength: "",
    speakingHabits: [],
    adaptiveInsight: "pressure to land the revenue answer crisply",
    welcomeHint:
      "First-time welcome. Invite curiosity with one simple question about what brought them in.",
  };
}

describe("AC practice handoff", () => {
  it("requires source=ac and a titled conversation", () => {
    assert.equal(AC_PRACTICE_HANDOFF_SOURCE, AC_HANDOFF_SOURCE);
    assert.equal(
      isAcPracticeHandoff({
        handoffSource: AC_HANDOFF_SOURCE,
        eventTitle: FRIENDS_MOMENT,
      }),
      true
    );
    assert.equal(
      isAcPracticeHandoff({
        handoffSource: AC_HANDOFF_SOURCE,
        eventTitle: "  ",
      }),
      false
    );
    assert.equal(
      isAcPracticeHandoff({
        eventTitle: FRIENDS_MOMENT,
      }),
      false
    );
  });

  it("treats the confirmed moment as the session and starts the first rep", () => {
    const lines = buildAcPracticeObjectiveLines({
      eventTitle: FRIENDS_MOMENT,
      successCriteria: "Start the conversation without freezing",
    });
    const text = Object.values(lines).join("\n");
    assert.match(text, /CONFIRMED CONVERSATION/);
    assert.match(text, /Starting a conversation with a friend/);
    assert.match(text, /This IS the session/);
    assert.match(text, /first spoken rep/);
    assert.match(text, /Forbidden in the opening: asking what brought them in/);
    assert.doesNotMatch(text, /Hold that lightly/);
    assert.doesNotMatch(
      text,
      /One curious question about what brought them in/
    );
    assert.doesNotMatch(text, /pressure to land the revenue answer/);
  });

  it("clears last-scenario memory and forbids re-intake in the welcome", () => {
    const overlaid = applyConfirmedPracticeHandoff(returningMemory(), {
      eventTitle: FRIENDS_MOMENT,
      successCriteria: "Start the conversation without freezing",
    });
    assert.match(overlaid.welcomeHint, /already known/);
    assert.match(overlaid.welcomeHint, /Starting a conversation with a friend/);
    assert.match(overlaid.welcomeHint, /Do not ask what brought them in/);
    assert.doesNotMatch(
      overlaid.welcomeHint,
      /Invite curiosity with one simple question about what brought them in/
    );
    assert.equal(overlaid.lastScenarioTitle, "");
    assert.equal(overlaid.adaptiveInsight, null);
    assert.equal(overlaid.lastSessionSummary, "");
  });

  it("opening speech names the moment and does not invite intake", () => {
    const text = buildOpeningSpeechInstructions({
      welcomeHint: returningMemory().welcomeHint,
      isReturning: false,
      eventTitle: FRIENDS_MOMENT,
      handoffSource: AC_HANDOFF_SOURCE,
    });
    assert.match(text, /confirmed first practice/i);
    assert.match(text, /Starting a conversation with a friend/);
    assert.match(text, /Do NOT ask what brought them in/i);
    assert.doesNotMatch(
      text,
      /Invite curiosity with one simple question about what brought them in|Ask one simple curious question about what brought them in|Usually one curious question/
    );
  });

  it("session mint and Arena forward the confirmed source into Forge prompts", () => {
    const sessionRoute = readFileSync(
      join(root, "app/api/realtime/session/route.ts"),
      "utf8"
    );
    const sessionConfig = readFileSync(
      join(root, "lib/ce/session-config.ts"),
      "utf8"
    );
    const arena = readFileSync(
      join(root, "app/components/VoiceArena.tsx"),
      "utf8"
    );
    assert.match(sessionRoute, /applyConfirmedPracticeHandoff/);
    assert.match(sessionRoute, /handoffSource: acHandoff \? AC_HANDOFF_SOURCE/);
    assert.match(sessionConfig, /buildAcPracticeObjectiveLines/);
    assert.match(sessionConfig, /handoffSource/);
    assert.match(
      arena,
      /handoffSource: isAssessment \? undefined : handoffSource/
    );
  });
});
