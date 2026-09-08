import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
  parseAnonCookieValue,
  sealAnonCookieValue,
  serializeAnonSetCookie,
} from "./anon-cookie.ts";
import {
  generateAnonSecret,
  hashAnonSecret,
} from "./anon-secret.ts";
import {
  ASSISTANT_COACH_ANON_COOKIE_SECRET_ENV,
  AssistantCoachConfigError,
  requireAssistantCoachAnonCookieSecret,
} from "./config.ts";
import {
  AnonMintKeyError,
  ensureAnonAssistantCoachSession,
} from "./session-service.ts";
import { createMemoryAssistantCoachSessionRepository } from "./session-repository.ts";
import { bootstrapGuestForgePreview } from "../forge/guest-preview.ts";

const secret = "test-assistant-coach-cookie-secret-32b!";

describe("signed anonymous preview session", () => {
  it("signs, verifies, and hashes the opaque browser secret", () => {
    const raw = generateAnonSecret();
    const sealed = sealAnonCookieValue(raw, secret);
    assert.deepEqual(parseAnonCookieValue(sealed, secret), {
      ok: true,
      rawSecret: raw,
    });
    assert.equal(hashAnonSecret(raw).length, 64);
    assert.equal(parseAnonCookieValue(`${sealed}x`, secret).ok, false);
  });

  it("emits an HttpOnly, same-site cookie", () => {
    const value = sealAnonCookieValue(generateAnonSecret(), secret);
    const serialized = serializeAnonSetCookie(value, {
      httpOnly: true,
      secure: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60,
    });
    assert.match(serialized, new RegExp(`^${ASSISTANT_COACH_ANON_COOKIE_NAME}=`));
    assert.match(serialized, /HttpOnly/);
    assert.match(serialized, /Secure/);
    assert.match(serialized, /SameSite=Lax/);
  });

  it("fails closed without a strong server secret", () => {
    assert.throws(
      () => requireAssistantCoachAnonCookieSecret({}),
      AssistantCoachConfigError
    );
    assert.throws(
      () =>
        requireAssistantCoachAnonCookieSecret({
          [ASSISTANT_COACH_ANON_COOKIE_SECRET_ENV]: "short",
        }),
      AssistantCoachConfigError
    );
    assert.equal(
      requireAssistantCoachAnonCookieSecret({
        [ASSISTANT_COACH_ANON_COOKIE_SECRET_ENV]: secret,
      }),
      secret
    );
  });

  it("requires an idempotency key for a cookieless mint", async () => {
    await assert.rejects(
      () =>
        ensureAnonAssistantCoachSession({
          repository: createMemoryAssistantCoachSessionRepository(),
          cookieSecret: secret,
          secureCookie: false,
        }),
      AnonMintKeyError
    );
  });

  it("restores the same active session from its signed cookie", async () => {
    const repository = createMemoryAssistantCoachSessionRepository();
    const first = await ensureAnonAssistantCoachSession({
      repository,
      cookieSecret: secret,
      mintKey: generateAnonSecret(),
      secureCookie: false,
    });
    const restored = await ensureAnonAssistantCoachSession({
      repository,
      cookieSecret: secret,
      cookieHeader: `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${first.sealedCookie}`,
      secureCookie: false,
    });
    assert.equal(restored.session.id, first.session.id);
    assert.equal(restored.outcome, "restored");
    assert.equal(restored.session.anonKeyHash, hashAnonSecret(first.rawSecret));
    assert.notEqual(restored.session.anonKeyHash, first.rawSecret);
  });

  it("restores and heals a historical gated cookie into a preview", async () => {
    const repository = createMemoryAssistantCoachSessionRepository();
    const raw = generateAnonSecret();
    const historical = await repository.seedLegacyGatedSession({
      anonKeyHash: hashAnonSecret(raw),
    });
    const restored = await ensureAnonAssistantCoachSession({
      repository,
      cookieSecret: secret,
      cookieHeader: `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${sealAnonCookieValue(raw, secret)}`,
      secureCookie: false,
    });
    assert.equal(restored.session.id, historical.id);
    assert.equal(restored.session.status, "gated");
    assert.equal(restored.session.userId, null);
    assert.equal("hasExperiencedValue" in restored.session, false);

    const preview = await bootstrapGuestForgePreview({
      repository,
      session: restored.session,
      topicId: "interview",
    });
    assert.equal(preview.status, "unused");
    assert.equal((await repository.getSession(historical.id))?.status, "active");
  });

  it("replaces an expired session without reviving it", async () => {
    const repository = createMemoryAssistantCoachSessionRepository();
    const now = new Date("2026-08-01T00:00:00.000Z");
    const first = await ensureAnonAssistantCoachSession({
      repository,
      cookieSecret: secret,
      mintKey: generateAnonSecret(),
      secureCookie: false,
      now,
    });
    const replacement = await ensureAnonAssistantCoachSession({
      repository,
      cookieSecret: secret,
      cookieHeader: `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${first.sealedCookie}`,
      mintKey: generateAnonSecret(),
      secureCookie: false,
      now: new Date("2026-08-16T00:00:00.000Z"),
    });
    assert.notEqual(replacement.session.id, first.session.id);
    assert.equal(replacement.outcome, "replaced");
    assert.equal((await repository.getSession(first.session.id)).status, "expired");
  });
});
