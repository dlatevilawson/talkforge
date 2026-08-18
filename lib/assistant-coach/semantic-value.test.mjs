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

    await assert.rejects(
      () =>
        runAssistantCoachTurn({
          repository: repo,
          session: second.session,
          message: "Also my throat tightens before I answer",
          clientTurnId: "v3",
          model: async () => ({
            reply: "Stay with that.",
            observations: [],
          }),
        }),
      (err) => err && err.code === "must_authenticate"
    );
    const after = await repo.getSession(minted.session.id);
    assert.equal(after.hasExperiencedValue, true);
    assert.equal(after.status, "gated");
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

describe("4B.6 hard gate", () => {
  it("blocks further anon turns after value without calling model", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });
    await repo.updateSessionFlags(minted.session.id, {
      hasExperiencedValue: true,
    });
    let calls = 0;
    await assert.rejects(
      async () =>
        runAssistantCoachTurn({
          repository: repo,
          session: await repo.getSession(minted.session.id),
          message: "one more question",
          clientTurnId: "blocked-1",
          model: async () => {
            calls += 1;
            return { reply: "should not run", observations: [] };
          },
        }),
      (err) =>
        err &&
        err.code === "must_authenticate" &&
        err.status === 403 &&
        err.gate?.mustAuthenticateToContinue === true
    );
    assert.equal(calls, 0);
    const session = await repo.getSession(minted.session.id);
    assert.equal(session.status, "gated");
  });

  it("allows idempotent replay of last allowed turn after gate", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });
    const first = await runAssistantCoachTurn({
      repository: repo,
      session: minted.session,
      message: "I want to speak clearly in board meetings with executives",
      clientTurnId: "last-ok",
      model: async () => ({
        reply: "What happens in that moment?",
        observations: [
          {
            text: "Wants to speak clearly in board meetings",
            category: "communication_goal",
            confidence: "high",
          },
        ],
      }),
    });
    await repo.updateSessionFlags(minted.session.id, {
      hasExperiencedValue: true,
      status: "gated",
    });
    const replay = await runAssistantCoachTurn({
      repository: repo,
      session: await repo.getSession(minted.session.id),
      message: "I want to speak clearly in board meetings with executives",
      clientTurnId: "last-ok",
      model: async () => ({ reply: "nope", observations: [] }),
    });
    assert.equal(replay.idempotentReplay, true);
    assert.equal(replay.reply, first.reply);
  });

  it("auth member with claimed session is not hard-gated by anon value rule", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });
    const userId = "11111111-1111-1111-1111-111111111111";
    await repo.updateSessionFlags(minted.session.id, {
      hasExperiencedValue: true,
      status: "gated",
    });
    // Claimed ownership simulation
    const claimed = {
      ...(await repo.getSession(minted.session.id)),
      userId,
      status: "claimed",
      claimedAt: new Date().toISOString(),
      hasExperiencedValue: true,
    };
    const wrapping = {
      ...repo,
      async getSession(id) {
        if (id === claimed.id) return claimed;
        return repo.getSession(id);
      },
      async getSessionByAnonKeyHash(h) {
        const row = await repo.getSessionByAnonKeyHash(h);
        if (row && row.id === claimed.id) return claimed;
        return row;
      },
      async updateSessionFlags(id, patch) {
        return repo.updateSessionFlags(id, patch);
      },
    };
    const result = await runAssistantCoachTurn({
      repository: wrapping,
      session: claimed,
      authUserId: userId,
      message: "Continue coaching me as a member",
      clientTurnId: "member-1",
      model: async () => ({
        reply: "Let's keep going.",
        observations: [],
      }),
    });
    assert.equal(result.reply, "Let's keep going.");
  });
});
