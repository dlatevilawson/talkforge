import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildShadowEvaluationPrompt,
  SHADOW_OUTPUT_JSON_SCHEMA,
  validateShadowModelOutput,
} from "./shadow-contract.ts";

const transcript = [
  { id: "turn-1", role: "member", text: "I need approval to delay the launch one week." },
  { id: "turn-2", role: "counterpart", text: "We cannot move the public date." },
  { id: "turn-3", role: "member", text: "Then let us reduce scope and protect checkout testing." },
  { id: "turn-4", role: "counterpart", text: "What exactly would you cut?" },
  { id: "turn-5", role: "member", text: "Cut the optional export and keep payments in scope." },
];

function validSignal(signal, overrides = {}) {
  return {
    signal,
    level: 3,
    nullReason: null,
    evidenceStrength: "sufficient",
    summary: "The behavior was demonstrated with current-session evidence.",
    evidence: [
      {
        evidenceType:
          signal === "composure" || signal === "adaptability"
            ? "friction"
            : "support",
        turnId: "turn-1",
        snippet: "I need approval to delay the launch one week.",
      },
      {
        evidenceType: "recovery",
        turnId: "turn-3",
        snippet: "Then let us reduce scope and protect checkout testing.",
      },
    ],
    ...overrides,
  };
}

function validOutput() {
  return {
    pressureLevel: "moderate",
    pressureEvidenceTurnIds: ["turn-2", "turn-4"],
    signals: [
      validSignal("purpose"),
      validSignal("perspective"),
      validSignal("composure"),
      validSignal("message"),
      validSignal("adaptability"),
    ],
  };
}

describe("readiness shadow structured contract", () => {
  it("defines exactly five structured signal results", () => {
    assert.equal(SHADOW_OUTPUT_JSON_SCHEMA.properties.signals.minItems, 5);
    assert.equal(SHADOW_OUTPUT_JSON_SCHEMA.properties.signals.maxItems, 5);
    assert.deepEqual(
      SHADOW_OUTPUT_JSON_SCHEMA.properties.signals.items.properties.signal.enum,
      ["purpose", "perspective", "composure", "message", "adaptability"]
    );
  });

  it("includes every approved level for every signal in the prompt", () => {
    const prompt = buildShadowEvaluationPrompt({
      scenarioFamily: "pitch",
      scenarioTitle: "Launch decision",
      modality: "voice",
      transcript,
    });
    for (const signal of ["PURPOSE", "PERSPECTIVE", "COMPOSURE", "MESSAGE", "ADAPTABILITY"]) {
      const start = prompt.indexOf(`\n${signal}\n`);
      assert.notEqual(start, -1);
      const section = prompt.slice(start, prompt.indexOf("\n\n", start + signal.length + 2));
      for (let level = 0; level <= 4; level += 1) {
        assert.match(section, new RegExp(`${level}:`));
      }
    }
  });

  it("accepts a complete, traceable output", () => {
    const result = validateShadowModelOutput(validOutput(), transcript);
    assert.equal(result.ok, true);
  });

  it("rejects fabricated or paraphrased evidence", () => {
    const output = validOutput();
    output.signals[0].evidence[0].snippet = "I confidently asked for a delay.";
    assert.deepEqual(validateShadowModelOutput(output, transcript), {
      ok: false,
      code: "EVIDENCE_UNTRACEABLE",
    });
  });

  it("keeps null separate from level zero", () => {
    const output = validOutput();
    output.signals[2] = validSignal("composure", {
      level: null,
      nullReason: "no_friction_event",
      evidenceStrength: "insufficient",
      summary: "No friction tested composure.",
      evidence: [],
    });
    assert.equal(validateShadowModelOutput(output, transcript).ok, true);

    output.signals[2].level = 0;
    assert.deepEqual(validateShadowModelOutput(output, transcript), {
      ok: false,
      code: "LEVEL_SEMANTICS_INVALID",
    });
  });

  it("refuses sufficient evidence supported by only one turn", () => {
    const output = validOutput();
    output.signals[0].evidence[1] = {
      evidenceType: "support",
      turnId: "turn-1",
      snippet: "delay the launch one week",
    };
    assert.deepEqual(validateShadowModelOutput(output, transcript), {
      ok: false,
      code: "SUFFICIENT_EVIDENCE_THIN",
    });
  });

  it("requires an observed test for Composure and Adaptability", () => {
    const output = validOutput();
    output.signals[2].evidence = output.signals[2].evidence.map((entry) => ({
      ...entry,
      evidenceType: "support",
    }));
    assert.deepEqual(validateShadowModelOutput(output, transcript), {
      ok: false,
      code: "REQUIRED_TEST_MISSING",
    });
  });
});
