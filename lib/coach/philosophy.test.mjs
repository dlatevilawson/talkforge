import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  FORGE_MENTOR_PHILOSOPHY,
  buildOpeningSpeechInstructions,
} from "./philosophy.ts";

describe("Coach Forge excellence philosophy (CFX-001)", () => {
  it("encodes listening, practice ratio, and when-not-to-coach", () => {
    assert.match(FORGE_MENTOR_PHILOSOPHY, /PRESENCE & LISTENING/);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /70–80%/);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /Do not coach when they need to vent/);
    assert.match(FORGE_MENTOR_PHILOSOPHY, /world's-best communication coach/i);
  });

  it("builds first-session openings without topic menus", () => {
    const text = buildOpeningSpeechInstructions({
      welcomeHint: "First-time welcome. Ask what brought them in.",
      isReturning: false,
      eventTitle: "The conversation I’ve been avoiding",
    });
    assert.match(text, /listen first/i);
    assert.match(text, /First session/);
    assert.match(text, /The conversation I’ve been avoiding/);
    assert.match(text, /questionnaire/i);
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
