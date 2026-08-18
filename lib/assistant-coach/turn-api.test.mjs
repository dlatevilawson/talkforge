/**
 * Phase 4B.4 — Assistant Coach turn API tests.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
  sealAnonCookieValue,
} from "./anon-cookie.ts";
import { generateAnonSecret, hashAnonSecret } from "./anon-secret.ts";
import { handleAssistantCoachTurnRequest } from "./http-turn.ts";
import { createMemoryAssistantCoachSessionRepository } from "./session-repository.ts";
import { ensureAnonAssistantCoachSession } from "./session-service.ts";
import {
  runAssistantCoachTurn,
} from "./turn-runtime.ts";
import { AssistantCoachConfigError } from "./config.ts";

const TEST_SECRET = "test-assistant-coach-cookie-secret-32b!";

function cookieHeader(sealed) {
  return `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${sealed}`;
}

function fixedModel(overrides = {}) {
  const model = async () => ({
    reply: "I hear that meetings freeze you. What happens in your body right before you go quiet?",
    observations: [
      {
        text: "Freezes in meetings when put on the spot",
        category: "communication_friction",
        confidence: "high",
      },
    ],
    ...overrides,
  });
  return model;
}

describe("4B.4 runAssistantCoachTurn", () => {
  it("persists user+assistant messages and accepted evidence on draft", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });
    const result = await runAssistantCoachTurn({
      repository: repo,
      session: minted.session,
      message: "I freeze in meetings when my manager asks me a question.",
      clientTurnId: "cturn_1",
      model: fixedModel(),
    });
    assert.equal(result.idempotentReplay, false);
    assert.match(result.reply, /freeze|meetings|body/i);
    assert.equal(result.session.turnCount, 1);
    const messages = await repo.listMessages(minted.session.id);
    assert.equal(messages.length, 2);
    assert.equal(messages[0].role, "user");
    assert.equal(messages[1].role, "assistant");
    const draft = await repo.getDraft(minted.session.id);
    assert.ok(draft);
    assert.ok(Array.isArray(draft.profileJson.evidenceLedger));
    assert.ok(draft.profileJson.evidenceLedger.length >= 1);
    assert.equal(
      draft.profileJson.evidenceLedger.some(
        (e) => e.category === "communication_friction"
      ),
      true
    );
    assert.equal(result.gate.copyKey, "placeholder");
    assert.equal(typeof result.gate.turnCap, "number");
    assert.ok(result.gate.turnCap >= 1);
  });

  it("rejects forbidden identity observations and preserves purpose", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });
    await repo.saveDraft({
      sessionId: minted.session.id,
      version: 2,
      profileJson: {
        purposeStatement: "Member owned purpose",
        evidenceLedger: [],
        profileInsights: [],
        personalPrinciples: [],
      },
    });
    const result = await runAssistantCoachTurn({
      repository: repo,
      session: minted.session,
      message: "I want to speak up more.",
      model: fixedModel({
        observations: [
          {
            text: "Their purpose is to lead",
            category: "purposeStatement",
            confidence: "high",
          },
          {
            text: "Wants to speak up in meetings",
            category: "communication_goal",
            confidence: "medium",
          },
        ],
      }),
    });
    const rejected = result.observationDecisions.filter((d) => !d.accepted);
    const accepted = result.observationDecisions.filter((d) => d.accepted);
    assert.ok(rejected.some((d) => d.reason === "forbidden_identity_category"));
    assert.equal(accepted.length, 1);
    const draft = await repo.getDraft(minted.session.id);
    assert.equal(draft.profileJson.purposeStatement, "Member owned purpose");
  });

  it("idempotent clientTurnId does not double-apply model or evidence", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });
    let calls = 0;
    const model = async () => {
      calls += 1;
      return {
        reply: "Tell me more about the freeze.",
        observations: [
          {
            text: "Freezes under manager questions",
            category: "communication_friction",
            confidence: "high",
          },
        ],
      };
    };
    const first = await runAssistantCoachTurn({
      repository: repo,
      session: minted.session,
      message: "I freeze",
      clientTurnId: "same-key",
      model,
    });
    const second = await runAssistantCoachTurn({
      repository: repo,
      session: (await repo.getSession(minted.session.id)),
      message: "I freeze",
      clientTurnId: "same-key",
      model,
    });
    assert.equal(calls, 1);
    assert.equal(second.idempotentReplay, true);
    assert.equal(second.reply, first.reply);
    assert.equal(second.session.turnCount, 1);
    const messages = await repo.listMessages(minted.session.id);
    assert.equal(messages.length, 2);
  });

  it("malformed model response fails closed", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });
    await assert.rejects(
      () =>
        runAssistantCoachTurn({
          repository: repo,
          session: minted.session,
          message: "hello",
          model: async () => ({ reply: "", observations: [] }),
        }),
      /missing reply/
    );
    assert.equal((await repo.listMessages(minted.session.id)).length, 0);
  });

  it("expired session cannot turn", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const now = new Date("2026-01-01T00:00:00.000Z");
    const mintKey = generateAnonSecret();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      now,
      secureCookie: false,
    });
    await assert.rejects(
      () =>
        runAssistantCoachTurn({
          repository: repo,
          session: minted.session,
          message: "hello",
          now: new Date("2026-02-01T00:00:00.000Z"),
          model: fixedModel(),
        }),
      /expired/
    );
  });

  it("claimed session rejects anon caller without matching auth", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });
    const row = await repo.getSession(minted.session.id);
    // Simulate claimed ownership via wrapping getSession used by runtime after load.
    const claimed = {
      ...row,
      userId: "11111111-1111-1111-1111-111111111111",
      status: "claimed",
      claimedAt: new Date().toISOString(),
    };
    await assert.rejects(
      () =>
        runAssistantCoachTurn({
          repository: {
            ...repo,
            async getSession(id) {
              if (id === claimed.id) return claimed;
              return repo.getSession(id);
            },
          },
          session: claimed,
          message: "hello",
          model: fixedModel(),
        }),
      /member account/
    );
  });
});

describe("4B.4 HTTP turn handler", () => {
  function depsWith(repo, model, extras = {}) {
    return {
      adminConfigured: () => true,
      requireCookieSecret: () => TEST_SECRET,
      createRepository: () => repo,
      createModel: () => model,
      ...extras,
    };
  }

  it("POST turn with cookie returns reply/session/gate and no-store", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });
    const res = await handleAssistantCoachTurnRequest(
      new Request("http://localhost/api/assistant-coach/turn", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: cookieHeader(minted.sealedCookie),
        },
        body: JSON.stringify({
          message: "I freeze in meetings",
          clientTurnId: "http-1",
        }),
      }),
      depsWith(repo, fixedModel())
    );
    assert.equal(res.status, 200);
    assert.match(res.headers.get("cache-control") || "", /no-store/);
    const body = await res.json();
    assert.ok(body.reply);
    assert.equal(body.session.id, minted.session.id);
    assert.equal(body.gate.copyKey, "placeholder");
    assert.equal(body.rawSecret, undefined);
    assert.equal(body.session.anonKeyHash, undefined);
  });

  it("rate limits by session", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });
    const deps = depsWith(repo, fixedModel(), {
      turnLimitPerSession: 1,
      turnLimitPerIp: 100,
    });
    const mk = (id) =>
      handleAssistantCoachTurnRequest(
        new Request("http://localhost/api/assistant-coach/turn", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            cookie: cookieHeader(minted.sealedCookie),
          },
          body: JSON.stringify({ message: "hi", clientTurnId: id }),
        }),
        deps
      );
    const first = await mk("r1");
    assert.equal(first.status, 200);
    const second = await mk("r2");
    assert.equal(second.status, 429);
  });

  it("missing cookie returns 401", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const res = await handleAssistantCoachTurnRequest(
      new Request("http://localhost/api/assistant-coach/turn", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message: "hi" }),
      }),
      depsWith(repo, fixedModel())
    );
    assert.equal(res.status, 401);
  });

  it("missing signing secret returns 503", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const sealed = sealAnonCookieValue(generateAnonSecret(), TEST_SECRET);
    const res = await handleAssistantCoachTurnRequest(
      new Request("http://localhost/api/assistant-coach/turn", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: cookieHeader(sealed),
        },
        body: JSON.stringify({ message: "hi" }),
      }),
      {
        adminConfigured: () => true,
        requireCookieSecret: () => {
          throw new AssistantCoachConfigError("missing secret");
        },
        createRepository: () => repo,
        createModel: () => fixedModel(),
      }
    );
    assert.equal(res.status, 503);
  });
});

describe("4B.4 scope guards", () => {
  it("does not introduce guest revival or claim/landing/Forge surfaces", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
    for (const rel of [
      "lib/assistant-coach/turn-runtime.ts",
      "lib/assistant-coach/http-turn.ts",
      "app/api/assistant-coach/turn/route.ts",
    ]) {
      const src = readFileSync(join(root, rel), "utf8");
      assert.doesNotMatch(src, /signInAnonymously|guest_/);
      assert.doesNotMatch(src, /\/coach|landing CTA|VoiceArena/);
      assert.doesNotMatch(src, /assistant-coach\/claim/);
    }
    void hashAnonSecret;
  });
});
