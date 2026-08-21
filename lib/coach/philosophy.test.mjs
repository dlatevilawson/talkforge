import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FORGE_FIRST_PRINCIPLE,
  FORGE_MENTOR_PHILOSOPHY,
  LISTEN_FIRST_SYSTEM_INSTRUCTION,
  MINIMAL_INTERVENTION_COACHING_RULES,
  buildListenFirstTurnInstructions,
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
    assert.match(FORGE_MENTOR_PHILOSOPHY, /Overwhelm \/ vent \/ clarify: Core escalation applies|Do not coach when they need to vent/);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /under Forge Core/i);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /world's-greatest communication coach/i);
  });

  it("requires listen → analyze → respond before coaching", () => {
    assert.match(LISTEN_FIRST_SYSTEM_INSTRUCTION, /LISTEN → ANALYZE → RESPOND/);
    assert.match(LISTEN_FIRST_SYSTEM_INSTRUCTION, /REFLECT|acknowledge|clarif/i);
    assert.match(LISTEN_FIRST_SYSTEM_INSTRUCTION, /clarifying question/i);
    assert.match(LISTEN_FIRST_SYSTEM_INSTRUCTION, /Forge owns the choice|judgment/i);
    const turn = buildListenFirstTurnInstructions();
    assert.match(turn, /hold-to-talk release/i);
    assert.match(turn, /You own the conversational move/i);
    assert.match(turn, /Do not monologue/i);
  });

  it("encodes minimal-intervention master communicator rules without token language", () => {
    assert.match(MINIMAL_INTERVENTION_COACHING_RULES, /MINIMAL INTERVENTION/);
    assert.match(MINIMAL_INTERVENTION_COACHING_RULES, /REFLECT → PROMPT/);
    assert.match(MINIMAL_INTERVENTION_COACHING_RULES, /Forge owns judgment|soft preference|Prefer short/i);
    assert.match(MINIMAL_INTERVENTION_COACHING_RULES, /DO NOT CLAIM TO FEEL/);
    assert.match(MINIMAL_INTERVENTION_COACHING_RULES, /STAY IN CHARACTER/);
    assert.match(
      MINIMAL_INTERVENTION_COACHING_RULES,
      /DO NOT MAKE EVERY TURN A COACHING LESSON/
    );
    assert.doesNotMatch(MINIMAL_INTERVENTION_COACHING_RULES, /Prefer fewer than 25 words/);
    assert.doesNotMatch(MINIMAL_INTERVENTION_COACHING_RULES, /token/i);
    assert.doesNotMatch(MINIMAL_INTERVENTION_COACHING_RULES, /max_output/i);
    assert.doesNotMatch(MINIMAL_INTERVENTION_COACHING_RULES, /meter/i);
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
    assert.doesNotMatch(text, /What would you like to practice today\?/i);
  });

  it("starts confirmed Coach practice instead of re-asking what brought them in", () => {
    const moment = "Starting a conversation with a friend";
    const text = buildOpeningSpeechInstructions({
      welcomeHint: "First-time welcome. Ask what brought them in.",
      isReturning: false,
      eventTitle: moment,
      handoffSource: "ac",
    });
    assert.match(text, /confirmed first practice/i);
    assert.match(text, /Starting a conversation with a friend/);
    assert.match(text, /first spoken rep/i);
    assert.match(text, /Do NOT ask what brought them in/i);
    assert.doesNotMatch(
      text,
      /Invite curiosity with one simple question about what brought them in|Ask one simple curious question about what brought them in|Usually one curious question/
    );
    assert.doesNotMatch(text, /Hold it lightly/i);
  });

  it("Home starting place without Coach handoff can still ask what brought them in", () => {
    const text = buildOpeningSpeechInstructions({
      isReturning: false,
    });
    assert.match(text, /what brought them in/i);
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
