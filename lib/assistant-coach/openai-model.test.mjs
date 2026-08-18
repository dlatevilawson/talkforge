/**
 * Fail-closed Assistant Coach model selection (Preview/Production).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
} from "./anon-cookie.ts";
import { generateAnonSecret } from "./anon-secret.ts";
import { AssistantCoachConfigError } from "./config.ts";
import { handleAssistantCoachTurnRequest } from "./http-turn.ts";
import {
  ASSISTANT_COACH_ALLOW_MOCK_MODEL_ENV,
  ASSISTANT_COACH_MODEL_NOT_CONFIGURED_PUBLIC,
  OPENAI_API_KEY_ENV,
  createExplicitMockAssistantCoachModel,
  createOpenAiAssistantCoachModel,
  isHostedAssistantCoachRuntime,
  resolveAssistantCoachModelMode,
} from "./openai-model.ts";
import { createMemoryAssistantCoachSessionRepository } from "./session-repository.ts";
import { ensureAnonAssistantCoachSession } from "./session-service.ts";
import { runAssistantCoachTurn } from "./turn-runtime.ts";

const TEST_SECRET = "test-assistant-coach-cookie-secret-32b!";

describe("Assistant Coach model fail-closed", () => {
  it("Preview + missing OPENAI_API_KEY → unavailable / fail closed", () => {
    const env = {
      VERCEL_ENV: "preview",
      NODE_ENV: "production",
    };
    assert.equal(isHostedAssistantCoachRuntime(env), true);
    assert.equal(resolveAssistantCoachModelMode(env), "unavailable");
    assert.throws(
      () => createOpenAiAssistantCoachModel(env),
      (err) =>
        err instanceof AssistantCoachConfigError &&
        err.message === ASSISTANT_COACH_MODEL_NOT_CONFIGURED_PUBLIC
    );
  });

  it("Production + missing OPENAI_API_KEY → unavailable / fail closed", () => {
    const env = {
      VERCEL_ENV: "production",
      NODE_ENV: "production",
    };
    assert.equal(resolveAssistantCoachModelMode(env), "unavailable");
    assert.throws(
      () => createOpenAiAssistantCoachModel(env),
      (err) =>
        err instanceof AssistantCoachConfigError &&
        err.message === ASSISTANT_COACH_MODEL_NOT_CONFIGURED_PUBLIC
    );
  });

  it("Preview ignores ASSISTANT_COACH_ALLOW_MOCK_MODEL opt-in", () => {
    const env = {
      VERCEL_ENV: "preview",
      NODE_ENV: "production",
      [ASSISTANT_COACH_ALLOW_MOCK_MODEL_ENV]: "true",
    };
    assert.equal(resolveAssistantCoachModelMode(env), "unavailable");
    assert.throws(() => createOpenAiAssistantCoachModel(env));
  });

  it("Production ignores ASSISTANT_COACH_ALLOW_MOCK_MODEL opt-in", () => {
    const env = {
      VERCEL_ENV: "production",
      [ASSISTANT_COACH_ALLOW_MOCK_MODEL_ENV]: "1",
    };
    assert.equal(resolveAssistantCoachModelMode(env), "unavailable");
  });

  it("Real provider configured → openai mode selected", () => {
    const env = {
      VERCEL_ENV: "preview",
      NODE_ENV: "production",
      [OPENAI_API_KEY_ENV]: "sk-test-not-a-real-key-for-mode-only",
    };
    assert.equal(resolveAssistantCoachModelMode(env), "openai");
    const model = createOpenAiAssistantCoachModel(env);
    assert.equal(typeof model, "function");
  });

  it("Local without key and without opt-in → fail closed (no silent mock)", () => {
    const env = { NODE_ENV: "development" };
    assert.equal(resolveAssistantCoachModelMode(env), "unavailable");
    assert.throws(
      () => createOpenAiAssistantCoachModel(env),
      (err) =>
        err instanceof AssistantCoachConfigError &&
        !String(err.message).includes(OPENAI_API_KEY_ENV)
    );
  });

  it("Local with explicit mock opt-in → explicit_mock path", async () => {
    const env = {
      NODE_ENV: "development",
      [ASSISTANT_COACH_ALLOW_MOCK_MODEL_ENV]: "true",
    };
    assert.equal(resolveAssistantCoachModelMode(env), "explicit_mock");
    const model = createOpenAiAssistantCoachModel(env);
    const out = await model({
      message: "I freeze in meetings",
      history: [],
      coachContext: {
        goals: [],
        activeFocusAreas: ["meetings"],
        supportedPatterns: [],
        keyEnvironments: [],
        strengths: [],
        trainingImplications: [],
        coachingPreferences: [],
        practiceCapacity: [],
        unresolvedQuestions: [],
        recentEvidence: [],
      },
    });
    assert.match(out.reply, /listening|meetings/i);
  });

  it("Explicit injected test model still works (bypass factory)", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey: generateAnonSecret(),
      secureCookie: false,
    });
    const injected = createExplicitMockAssistantCoachModel();
    const result = await runAssistantCoachTurn({
      repository: repo,
      session: minted.session,
      message: "I freeze when asked a question",
      clientTurnId: "inject-1",
      model: injected,
    });
    assert.ok(result.reply.length > 0);
    assert.equal(result.idempotentReplay, false);
  });

  it("HTTP turn returns 503 public config error when factory fails closed", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey: generateAnonSecret(),
      secureCookie: false,
    });
    const res = await handleAssistantCoachTurnRequest(
      new Request("http://localhost/api/assistant-coach/turn", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${minted.sealedCookie}`,
        },
        body: JSON.stringify({
          message: "hello",
          clientTurnId: "cfg-1",
        }),
      }),
      {
        adminConfigured: () => true,
        requireCookieSecret: () => TEST_SECRET,
        createRepository: () => repo,
        createModel: () =>
          createOpenAiAssistantCoachModel({
            VERCEL_ENV: "preview",
            NODE_ENV: "production",
          }),
      }
    );
    assert.equal(res.status, 503);
    const body = await res.json();
    assert.equal(body.error, ASSISTANT_COACH_MODEL_NOT_CONFIGURED_PUBLIC);
    assert.equal(body.error.includes(OPENAI_API_KEY_ENV), false);
  });

  it("No model factory invocation after 4B.6 hard gate", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const minted = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey: generateAnonSecret(),
      secureCookie: false,
    });
    await repo.updateSessionFlags(minted.session.id, {
      hasExperiencedValue: true,
      status: "gated",
    });
    let factoryCalls = 0;
    let modelCalls = 0;
    const res = await handleAssistantCoachTurnRequest(
      new Request("http://localhost/api/assistant-coach/turn", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          cookie: `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${minted.sealedCookie}`,
        },
        body: JSON.stringify({
          message: "another turn",
          clientTurnId: "gated-no-model",
        }),
      }),
      {
        adminConfigured: () => true,
        requireCookieSecret: () => TEST_SECRET,
        createRepository: () => repo,
        createModel: () => {
          factoryCalls += 1;
          return async () => {
            modelCalls += 1;
            return { reply: "should not run", observations: [] };
          };
        },
      }
    );
    assert.equal(res.status, 403);
    const body = await res.json();
    assert.equal(body.code, "must_authenticate");
    assert.equal(factoryCalls, 0);
    assert.equal(modelCalls, 0);
  });
});

describe("openai-model scope", () => {
  it("does not silently return mockModel when key absent on hosted env", () => {
    const src = readFileSync(
      fileURLToPath(new URL("./openai-model.ts", import.meta.url)),
      "utf8"
    );
    assert.doesNotMatch(src, /if\s*\(\s*!client\s*\)\s*return\s*mockModel/);
    assert.match(src, /ASSISTANT_COACH_ALLOW_MOCK_MODEL/);
    assert.match(src, /MODEL_NOT_CONFIGURED|unavailable/);
  });
});
