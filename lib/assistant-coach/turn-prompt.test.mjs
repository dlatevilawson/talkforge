/**
 * Assistant Coach turn prompt: Understand me, not Forge training.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import { buildAssistantCoachTurnPrompt } from "./turn-prompt.ts";

const emptyContext = {
  goals: [],
  activeFocusAreas: [],
  supportedPatterns: [],
  keyEnvironments: [],
  strengths: [],
  trainingImplications: [],
  coachingPreferences: [],
  practiceCapacity: [],
  unresolvedQuestions: [],
  recentEvidence: [],
};

describe("Assistant Coach turn prompt", () => {
  it("understands the visitor; does not train like Forge", () => {
    const prompt = buildAssistantCoachTurnPrompt({
      message: "Starting a conversation",
      history: [
        {
          role: "user",
          content:
            "I’m having a midlife crisis and I don’t know how to connect with my friends",
        },
      ],
      coachContext: emptyContext,
    });
    assert.match(prompt, /understand this person/i);
    assert.match(prompt, /You are NOT Forge/i);
    assert.match(prompt, /Ask at most one focused question/i);
    assert.match(prompt, /ONE short usable first move/i);
    assert.doesNotMatch(prompt, /pre-account understanding coach/i);
    assert.doesNotMatch(prompt, /deliver concrete help when you have enough context/i);
    assert.match(prompt, /all the above/i);
    assert.match(prompt, /Numbered or bulleted lists of scripts/i);
    assert.match(prompt, /They likely/i);
    assert.match(prompt, /intervention/i);
    assert.match(prompt, /Starting a conversation/);
  });

  it("live model adapter uses the extracted prompt builder", () => {
    const src = readFileSync(
      fileURLToPath(new URL("./openai-model.ts", import.meta.url)),
      "utf8"
    );
    assert.match(src, /buildAssistantCoachTurnPrompt/);
    assert.doesNotMatch(src, /pre-account understanding coach/);
    assert.doesNotMatch(src, /deliver concrete help when you have enough context/);
  });
});
