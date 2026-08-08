import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  BREVITY_SYSTEM_INSTRUCTION,
  FORGE_FIRST_PRINCIPLE,
  FORGE_MENTOR_PHILOSOPHY,
  FORGE_TURN_MAX_OUTPUT_TOKENS,
  buildOpeningSpeechInstructions,
} from "./philosophy.ts";

describe("Coach Forge philosophy (CFP-001 + CFX-001)", () => {
  it("encodes first principle, demonstration standard, and practice loop", () => {
    assert.equal(FORGE_FIRST_PRINCIPLE, "Understand before you coach.");
    assert.match(FORGE_MENTOR_PHILOSOPHY, /THE FIRST PRINCIPLE/);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /Forge does not teach communication\. Forge demonstrates it/);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /What does this person need most right now/);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /Practice → Reflect → Adjust → Repeat/);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /Confidence cannot be given/);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /PRESENCE & LISTENING/);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /70–80%/);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /Do not coach when they need to vent/);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /world's-greatest communication coach/i);
  });

  it("encodes hard brevity and airtime guardrails", () => {
    assert.equal(FORGE_TURN_MAX_OUTPUT_TOKENS, 120);
    assert.match(BREVITY_SYSTEM_INSTRUCTION, /MAX 3 SENTENCES PER TURN/);
    assert.match(BREVITY_SYSTEM_INSTRUCTION, /80%/);
    assert.match(BREVITY_SYSTEM_INSTRUCTION, /ONE POINT PER TURN/);
    assert.match(BREVITY_SYSTEM_INSTRUCTION, /ZERO SYCOPHANCY/);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /Hard cap in voice/);
  });

  it("builds first-session openings without topic menus", () => {
    const text = buildOpeningSpeechInstructions({
      welcomeHint: "First-time welcome. Ask what brought them in.",
      isReturning: false,
      eventTitle: "The conversation I’ve been avoiding",
    });
    assert.match(text, /Understand before you coach/i);
    assert.match(text, /First session/);
    assert.match(text, /The conversation I’ve been avoiding/);
    assert.match(text, /questionnaire/i);
    assert.match(text, /HARD CAP|max 3 short sentences/i);
    assert.doesNotMatch(text, /What would you like to practice today\?/i);
  });

  it("builds continuity openings for returning members", () => {
    const text = buildOpeningSpeechInstructions({
      welcomeHint: "Forge Law #012 continuity. Welcome back.",
      isReturning: true,
    });
    assert.match(text, /continuity/i);
    assert.match(text, /Never ask a blank/i);
  });
});
