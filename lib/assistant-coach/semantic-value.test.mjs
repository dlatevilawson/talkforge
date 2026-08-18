/**
 * Phase 4B.5 — semantic value + turn-cap gate flag tests.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { generateAnonSecret } from "./anon-secret.ts";
import { createMemoryAssistantCoachSessionRepository } from "./session-repository.ts";
import { ensureAnonAssistantCoachSession } from "./session-service.ts";
import { runAssistantCoachTurn } from "./turn-runtime.ts";
import {
  computeHasExperiencedValue,
  isVagueAspirationOnly,
} from "./semantic-value.ts";
import { buildGateFlags } from "./gate-flags.ts";
import { getAssistantCoachAnonTurnCap } from "./config.ts";

const TEST_SECRET = "test-assistant-coach-cookie-secret-32b!";

describe("4B.5 semantic value", () => {
  it("requires at least two substantive user turns", () => {
    assert.equal(
      computeHasExperiencedValue({
        evidenceLedger: [
          {
            id: "1",
            userId: "u",
            sourceType: "assistant_coach",
            sourceId: "s",
            observedAt: "2026-01-01T00:00:00.000Z",
            text: "Wants to speak clearly in board meetings",
            category: "communication_goal",
            confidence: "high",
            metadata: {},
          },
          {
            id: "2",
            userId: "u",
            sourceType: "assistant_coach",
            sourceId: "s",
            observedAt: "2026-01-01T00:00:00.000Z",
            text: "Freezes when the CEO asks a direct question",
            category: "communication_friction",
            confidence: "high",
            metadata: {},
          },
        ],
        profileInsights: [],
        messages: [{ role: "user", content: "only one long enough turn here" }],
      }),
      false
    );
  });

  it("path V1: grounded goal + friction after two turns", () => {
    assert.equal(
      computeHasExperiencedValue({
        evidenceLedger: [
          {
            id: "1",
            userId: "u",
            sourceType: "assistant_coach",
            sourceId: "s",
            observedAt: "2026-01-01T00:00:00.000Z",
            text: "Wants to speak clearly in board meetings",
            category: "communication_goal",
            confidence: "high",
            metadata: {},
          },
          {
            id: "2",
            userId: "u",
            sourceType: "assistant_coach",
            sourceId: "s",
            observedAt: "2026-01-01T00:00:00.000Z",
            text: "Freezes when the CEO asks a direct question",
            category: "communication_friction",
            confidence: "high",
            metadata: {},
          },
        ],
        profileInsights: [],
        messages: [
          { role: "user", content: "I freeze in executive meetings" },
          { role: "assistant", content: "Tell me more" },
          { role: "user", content: "Especially when my CEO puts me on the spot" },
        ],
      }),
      true
    );
  });

  it("vague aspiration alone does not count as value", () => {
    assert.equal(isVagueAspirationOnly("be better"), true);
    assert.equal(
      computeHasExperiencedValue({
        evidenceLedger: [
          {
            id: "1",
            userId: "u",
            sourceType: "assistant_coach",
            sourceId: "s",
            observedAt: "2026-01-01T00:00:00.000Z",
            text: "be better",
            category: "communication_goal",
            confidence: "low",
            metadata: {},
          },
        ],
        profileInsights: [],
        messages: [
          { role: "user", content: "I want to be better at talking" },
          { role: "user", content: "Just improve overall somehow" },
        ],
      }),
      false
    );
  });

  it("sticky hasExperiencedValue once achieved across turns", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });

    const model = async ({ message }) => ({
      reply: "What happens in that moment?",
      observations: [
        {
          text: message,
          category: message.includes("CEO")
            ? "communication_friction"
            : "communication_goal",
          confidence: "high",
        },
      ],
    });

    const first = await runAssistantCoachTurn({
      repository: repo,
      session: minted.session,
      message: "I want to speak clearly in board meetings with executives",
      clientTurnId: "v1",
      model,
    });
    assert.equal(first.session.hasExperiencedValue, false);

    const second = await runAssistantCoachTurn({
      repository: repo,
      session: (await repo.getSession(minted.session.id)),
      message: "I freeze when the CEO asks me a direct question on the spot",
      clientTurnId: "v2",
      model,
    });
    assert.equal(second.session.hasExperiencedValue, true);
    assert.equal(second.gate.hasExperiencedValue, true);
    assert.equal(second.gate.mustAuthenticateToContinue, true);

    const third = await runAssistantCoachTurn({
      repository: repo,
      session: (await repo.getSession(minted.session.id)),
      message: "Also my throat tightens before I answer",
      clientTurnId: "v3",
      model: async () => ({
        reply: "Stay with that.",
        observations: [],
      }),
    });
    assert.equal(third.session.hasExperiencedValue, true);
  });

  it("cap alone sets mustAuthenticate without setting value", () => {
    const session = {
      id: "s",
      anonKeyHash: "h",
      userId: null,
      status: "active",
      turnCount: 10,
      hasExperiencedValue: false,
      expiresAt: "2099-01-01T00:00:00.000Z",
      claimedAt: null,
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    };
    const gate = buildGateFlags(session, { turnCap: 10, isAnonymous: true });
    assert.equal(gate.hasExperiencedValue, false);
    assert.equal(gate.mustAuthenticateToContinue, true);
    assert.equal(gate.turnCap, 10);
  });

  it("turn cap config defaults to 10", () => {
    assert.equal(getAssistantCoachAnonTurnCap({}), 10);
    assert.equal(
      getAssistantCoachAnonTurnCap({ ASSISTANT_COACH_ANON_TURN_CAP: "7" }),
      7
    );
  });
});
