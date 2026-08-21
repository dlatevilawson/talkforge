import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  awarenessBriefLine,
  collectAwarenessSignals,
} from "./awareness-steward.ts";

function base(overrides = {}) {
  return {
    productHealth: {
      sessionsCompleted: 4,
      sessionsTotal: 4,
      averageScore: 70,
      reflectionsSaved: 1,
      lastSessionAt: "2026-08-21T00:00:00.000Z",
      lastScenarioTitle: "Practice",
      uniqueUsers: 1,
      tone: "good",
      summary: "Practice loop is healthy.",
    },
    database: {
      configured: true,
      reachable: true,
      backend: "supabase",
      profileCount: 3,
      message: "Supabase reachable.",
      tone: "good",
    },
    github: {
      available: true,
      repo: "dlatevilawson/talkforge",
      openPullRequests: 1,
      message: "GitHub live.",
      tone: "good",
      activity: [],
    },
    aiUsage: {
      openaiConfigured: true,
      forgeTurnsRecent: 10,
      sessionsWithCoaching: 4,
      averageCoachScore: 70,
      estimatedCostUsd: 1,
      currency: "USD",
      message: "OpenAI configured.",
      tone: "good",
    },
    openBugs: [],
    nextAction: {
      title: "Continue the current slice",
      reason: "Work is unblocked.",
      href: "/founder/atlas",
      cta: "Open Atlas",
      urgency: "low",
    },
    deploymentStatus: "healthy",
    ...overrides,
  };
}

describe("Atlas awareness steward (IV-AI-008)", () => {
  it("stays quiet when the company is in balance", () => {
    const signals = collectAwarenessSignals(base());
    assert.equal(signals.length, 0);
    assert.match(
      awarenessBriefLine(signals),
      /no material imbalances detected/i
    );
    assert.match(awarenessBriefLine(signals), /engineering owns remediation/i);
  });

  it("surfaces a down database as critical and does not invent a fix", () => {
    const signals = collectAwarenessSignals(
      base({
        database: {
          configured: true,
          reachable: false,
          backend: "supabase",
          profileCount: null,
          message: "Supabase unreachable.",
          tone: "bad",
        },
      })
    );
    assert.equal(signals[0].severity, "critical");
    assert.equal(signals[0].owner, "engineering");
    assert.match(signals[0].fact, /unreachable/i);
    assert.doesNotMatch(JSON.stringify(signals), /open a PR|patch|migrate/i);
  });

  it("tells the Founder when Forge cannot coach", () => {
    const signals = collectAwarenessSignals(
      base({
        aiUsage: {
          openaiConfigured: false,
          forgeTurnsRecent: 0,
          sessionsWithCoaching: 0,
          averageCoachScore: 0,
          estimatedCostUsd: 0,
          currency: "USD",
          message: "Missing key.",
          tone: "bad",
        },
      })
    );
    assert.ok(signals.some((s) => s.id === "systems-openai"));
  });
});
