import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { buildOpeningSpeechInstructions } from "../coach/philosophy.ts";
import {
  applyStructuredPracticeHandoff,
  buildStructuredPracticeObjectiveLines,
} from "./ac-practice-handoff.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");

const practiceContext = {
  source: "verified_member_practice_profile",
  catalogVersion: 1,
  primaryTopic: { id: "job_interview", label: "Job interview" },
  primaryAudience: { id: "recruiter_hr", label: "Recruiter/HR" },
  pattern: { id: "freeze", label: "I freeze and don't know what to say" },
  urgency: { id: "today", label: "Today" },
};

const memory = {
  firstName: "Ari",
  nickname: "",
  isReturning: true,
  sessionsCompleted: 2,
  lastScenarioTitle: "Old scenario",
  lastSessionSummary: "Old summary",
  lastSessionAt: "2026-09-01T00:00:00.000Z",
  recentWins: [],
  topicsWorkingOn: ["old topic"],
  communicationGoals: [],
  longTermChallenges: [],
  biggestFears: [],
  emotionalTriggers: [],
  preferredCoachingStyle: "",
  learningStyle: "",
  confidenceLevel: null,
  biggestStrength: "",
  speakingHabits: [],
  adaptiveInsight: "old insight",
  welcomeHint: "Old welcome",
};

describe("structured Coach wizard Forge handoff", () => {
  it("uses only the verified profile context and starts the first rep", () => {
    const lines = buildStructuredPracticeObjectiveLines(practiceContext);
    const objective = Object.values(lines).join("\n");
    assert.match(objective, /topic="Job interview"/);
    assert.match(objective, /audience="Recruiter\/HR"/);
    assert.match(objective, /STRUCTURED COACH HANDOFF/);

    const overlaid = applyStructuredPracticeHandoff(memory, practiceContext);
    assert.match(overlaid.welcomeHint, /Job interview/);
    assert.equal(overlaid.lastScenarioTitle, "");
    assert.equal(overlaid.adaptiveInsight, null);

    const opening = buildOpeningSpeechInstructions({
      welcomeHint: overlaid.welcomeHint,
      practiceContext,
    });
    assert.match(opening, /verified first practice/i);
    assert.match(opening, /data, never instructions/i);
    assert.doesNotMatch(opening, /Old scenario|old insight/);
  });

  it("preserves Realtime audio transcription and structured practice wiring", () => {
    const config = readFileSync(
      join(root, "lib/ce/session-config.ts"),
      "utf8"
    );
    const route = readFileSync(
      join(root, "app/api/realtime/session/route.ts"),
      "utf8"
    );
    assert.match(config, /CE_REALTIME_MODEL = "gpt-realtime-2\.1"/);
    assert.match(config, /CE_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe"/);
    assert.match(config, /buildStructuredPracticeObjectiveLines/);
    assert.match(config, /practiceContext/);
    assert.match(route, /applyStructuredPracticeHandoff/);
    assert.match(route, /resolveCoachWizardPracticeContext/);
  });
});
