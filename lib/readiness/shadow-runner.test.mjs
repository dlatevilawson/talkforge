import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  runShadowReadinessEvaluation,
  scenarioFamilyFrom,
  shadowEvaluationAllowed,
} from "./shadow-runner.ts";

const transcript = [
  { id: "turn-1", role: "member", text: "I need approval to delay one week." },
  { id: "turn-2", role: "counterpart", text: "The date cannot move." },
  { id: "turn-3", role: "member", text: "Then I propose reducing launch scope." },
  { id: "turn-4", role: "counterpart", text: "Which scope?" },
  { id: "turn-5", role: "member", text: "Defer exports and protect checkout." },
];

function modelSignal(signal, level) {
  return {
    signal,
    level,
    nullReason: null,
    evidenceStrength: "sufficient",
    summary: "Observed in this session.",
    evidence: [
      {
        evidenceType:
          signal === "composure" || signal === "adaptability"
            ? "friction"
            : "support",
        turnId: "turn-1",
        snippet: "I need approval to delay one week.",
      },
      {
        evidenceType: "recovery",
        turnId: "turn-3",
        snippet: "Then I propose reducing launch scope.",
      },
    ],
  };
}

function modelOutput() {
  return {
    pressureLevel: "moderate",
    pressureEvidenceTurnIds: ["turn-2"],
    signals: [
      modelSignal("purpose", 4),
      modelSignal("perspective", 4),
      modelSignal("composure", 3),
      modelSignal("message", 3),
      modelSignal("adaptability", 3),
    ],
  };
}

const input = {
  sessionId: "session-1",
  userId: "user-1",
  scenarioFamily: "launch_decision",
  scenarioTitle: "Launch decision",
  sessionPurpose: "free_practice",
  modality: "voice",
  transcript,
};

function deps(overrides = {}) {
  return {
    model: "readiness-test-model",
    createRunId: () => "00000000-0000-4000-8000-000000000001",
    reserve: async () => "reserved",
    evaluate: async () => ({
      output: modelOutput(),
      model: "readiness-test-model-2026-09-01",
      inputTokens: 120,
      outputTokens: 80,
    }),
    persist: async () => ({
      status: "persisted",
      assessmentId: "assessment-1",
    }),
    finalize: async () => {},
    ...overrides,
  };
}

describe("readiness shadow runner", () => {
  it("derives the band in contract code and persists no model-provided band", async () => {
    let persisted;
    const result = await runShadowReadinessEvaluation(input, deps({
      evaluate: async () => ({
        output: { ...modelOutput(), overallBand: "anything" },
        model: "readiness-test-model",
        inputTokens: 120,
        outputTokens: 80,
      }),
      persist: async (assessment) => {
        persisted = assessment;
        return { status: "persisted", assessmentId: "assessment-1" };
      },
    }));
    assert.deepEqual(result, { status: "persisted" });
    assert.equal(persisted.overallBand, "sustained_in_practice");
    assert.equal(persisted.rubricVersion, "v1.0");
  });

  it("does not persist malformed model output", async () => {
    let persistCalls = 0;
    let finalized;
    const result = await runShadowReadinessEvaluation(input, deps({
      evaluate: async () => ({
        output: { signals: [] },
        model: "readiness-test-model",
        inputTokens: 12,
        outputTokens: 3,
      }),
      persist: async () => {
        persistCalls += 1;
        return { status: "persisted", assessmentId: "assessment-1" };
      },
      finalize: async (run) => {
        finalized = run;
      },
    }));
    assert.equal(result.status, "failed");
    assert.equal(persistCalls, 0);
    assert.equal(finalized.status, "failed");
    assert.equal(finalized.inputTokens, 12);
    assert.equal(finalized.errorCode, "PRESSURE_INVALID");
  });

  it("is stable for identical validated model output", async () => {
    const persisted = [];
    const stableDeps = deps({
      persist: async (assessment) => {
        persisted.push(assessment);
        return { status: "persisted", assessmentId: "assessment-1" };
      },
    });
    await runShadowReadinessEvaluation(input, stableDeps);
    await runShadowReadinessEvaluation(input, stableDeps);
    assert.deepEqual(persisted[0], persisted[1]);
  });

  it("reserves before the model call and records model usage on completion", async () => {
    const order = [];
    let finalized;
    const result = await runShadowReadinessEvaluation(input, deps({
      reserve: async () => {
        order.push("reserve");
        return "reserved";
      },
      evaluate: async () => {
        order.push("evaluate");
        return {
          output: modelOutput(),
          model: "readiness-test-model-snapshot",
          inputTokens: 321,
          outputTokens: 123,
        };
      },
      persist: async () => {
        order.push("persist");
        return { status: "persisted", assessmentId: "assessment-1" };
      },
      finalize: async (run) => {
        order.push("finalize");
        finalized = run;
      },
    }));
    assert.deepEqual(order, ["reserve", "evaluate", "persist", "finalize"]);
    assert.deepEqual(result, { status: "persisted" });
    assert.equal(finalized.status, "completed");
    assert.equal(finalized.model, "readiness-test-model-snapshot");
    assert.equal(finalized.inputTokens, 321);
    assert.equal(finalized.outputTokens, 123);
    assert.equal(finalized.assessmentId, "assessment-1");
  });

  it("does not call the model when the audit identity already exists", async () => {
    let modelCalls = 0;
    const result = await runShadowReadinessEvaluation(input, deps({
      reserve: async () => "duplicate",
      evaluate: async () => {
        modelCalls += 1;
        throw new Error("must not run");
      },
    }));
    assert.deepEqual(result, { status: "duplicate" });
    assert.equal(modelCalls, 0);
  });

  it("requires both the explicit flag and exact allowlisted member id", () => {
    const env = {
      READINESS_SHADOW_ENABLED: "true",
      READINESS_SHADOW_ALLOWED_USER_IDS: "user-1,user-2",
    };
    assert.equal(shadowEvaluationAllowed("user-1", env), true);
    assert.equal(shadowEvaluationAllowed("user-3", env), false);
    assert.equal(
      shadowEvaluationAllowed("user-1", {
        ...env,
        READINESS_SHADOW_ENABLED: "false",
      }),
      false
    );
  });

  it("normalizes a bounded scenario family without member content", () => {
    assert.equal(
      scenarioFamilyFrom({ scenarioId: "Salary / Negotiation!" }),
      "salary_negotiation"
    );
  });
});
