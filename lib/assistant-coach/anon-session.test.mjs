/**
 * Phase 4B.3 — signed anon cookie + session mint/restore.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
  buildAnonCookieAttributes,
  parseAnonCookieValue,
  readCookieFromHeader,
  sealAnonCookieValue,
  serializeAnonSetCookie,
} from "./anon-cookie.ts";
import { generateAnonSecret, hashAnonSecret } from "./anon-secret.ts";
import {
  ASSISTANT_COACH_ANON_COOKIE_SECRET_ENV,
  AssistantCoachConfigError,
  requireAssistantCoachAnonCookieSecret,
} from "./config.ts";
import { ensureAnonAssistantCoachSession } from "./session-service.ts";
import {
  createMemoryAssistantCoachSessionRepository,
} from "./session-repository.ts";
import { mapSessionRow } from "./session-mappers.ts";

const TEST_SECRET = "test-assistant-coach-cookie-secret-32b!";

function cookieHeaderFromSeal(sealed) {
  return `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${sealed}`;
}

describe("4B.3 anon secret hashing", () => {
  it("stores only a one-way hash, never the raw secret", () => {
    const raw = generateAnonSecret();
    const hash = hashAnonSecret(raw);
    assert.notEqual(hash, raw);
    assert.equal(hash.length, 64);
    assert.equal(hashAnonSecret(raw), hash);
    assert.notEqual(hashAnonSecret(raw + "x"), hash);
  });
});

describe("4B.3 signed cookie", () => {
  it("seals and verifies an opaque secret without identity fields", () => {
    const raw = generateAnonSecret();
    const sealed = sealAnonCookieValue(raw, TEST_SECRET);
    assert.match(sealed, /^v1\./);
    assert.doesNotMatch(sealed, /user_id|session_id|transcript|profile/i);
    const parsed = parseAnonCookieValue(sealed, TEST_SECRET);
    assert.equal(parsed.ok, true);
    if (parsed.ok) assert.equal(parsed.rawSecret, raw);
  });

  it("rejects tampered cookies", () => {
    const sealed = sealAnonCookieValue(generateAnonSecret(), TEST_SECRET);
    const parts = sealed.split(".");
    parts[2] = parts[2].replace(/.$/, parts[2].endsWith("a") ? "b" : "a");
    const parsed = parseAnonCookieValue(parts.join("."), TEST_SECRET);
    assert.equal(parsed.ok, false);
    if (!parsed.ok) assert.equal(parsed.reason, "tampered");
  });

  it("rejects malformed cookies without throwing", () => {
    for (const bad of ["", "v1.only", "v2.a.b", "nope", "v1..sig"]) {
      const parsed = parseAnonCookieValue(bad, TEST_SECRET);
      assert.equal(parsed.ok, false);
    }
  });

  it("cookie attributes are HttpOnly, path /, SameSite=Lax, Max-Age aligned", () => {
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const attrs = buildAnonCookieAttributes(expiresAt, {
      secure: true,
      now: new Date(),
    });
    assert.equal(attrs.httpOnly, true);
    assert.equal(attrs.secure, true);
    assert.equal(attrs.sameSite, "lax");
    assert.equal(attrs.path, "/");
    assert.ok(attrs.maxAge > 13 * 24 * 60 * 60);
    const header = serializeAnonSetCookie("v1.x.y", attrs);
    assert.match(header, /HttpOnly/);
    assert.match(header, /Secure/);
    assert.match(header, /SameSite=Lax/);
    assert.match(header, /Path=\//);
  });
});

describe("4B.3 config fail-closed", () => {
  it("throws when signing secret is absent", () => {
    assert.throws(
      () =>
        requireAssistantCoachAnonCookieSecret({
          NODE_ENV: "production",
        }),
      (err) =>
        err instanceof AssistantCoachConfigError &&
        err.message.includes(ASSISTANT_COACH_ANON_COOKIE_SECRET_ENV)
    );
  });

  it("throws when signing secret is too short", () => {
    assert.throws(
      () =>
        requireAssistantCoachAnonCookieSecret({
          [ASSISTANT_COACH_ANON_COOKIE_SECRET_ENV]: "too-short",
        }),
      AssistantCoachConfigError
    );
  });

  it("accepts a strong secret", () => {
    assert.equal(
      requireAssistantCoachAnonCookieSecret({
        [ASSISTANT_COACH_ANON_COOKIE_SECRET_ENV]: TEST_SECRET,
      }),
      TEST_SECRET
    );
  });
});

describe("4B.3 ensureAnonAssistantCoachSession", () => {
  it("first visit mints one session + sealed cookie", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const result = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      cookieHeader: null,
      secureCookie: false,
    });
    assert.equal(result.outcome, "minted");
    assert.equal(result.session.status, "active");
    assert.equal(result.session.userId, null);
    assert.equal(result.session.turnCount, 0);
    assert.equal(result.session.hasExperiencedValue, false);
    assert.equal(result.session.anonKeyHash, hashAnonSecret(result.rawSecret));
    assert.notEqual(result.session.anonKeyHash, result.rawSecret);
    assert.doesNotMatch(result.sealedCookie, /transcript|profile|user_id/i);
    assert.equal(result.publicSession.id, result.session.id);
    assert.equal(
      "anonKeyHash" in result.publicSession,
      false
    );
  });

  it("valid cookie restores the same session on refresh", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const first = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      secureCookie: false,
    });
    const second = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      cookieHeader: cookieHeaderFromSeal(first.sealedCookie),
      secureCookie: false,
    });
    assert.equal(second.outcome, "restored");
    assert.equal(second.session.id, first.session.id);
    assert.equal(second.rawSecret, first.rawSecret);
  });

  it("refresh does not create another session", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const first = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      secureCookie: false,
    });
    await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      cookieHeader: cookieHeaderFromSeal(first.sealedCookie),
      secureCookie: false,
    });
    await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      cookieHeader: cookieHeaderFromSeal(first.sealedCookie),
      secureCookie: false,
    });
    // Only one restorable row for this hash.
    const again = await repo.getSessionByAnonKeyHash(
      hashAnonSecret(first.rawSecret)
    );
    assert.ok(again);
    assert.equal(again.id, first.session.id);
  });

  it("tampered cookie is rejected and replaced safely", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const first = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      secureCookie: false,
    });
    const parts = first.sealedCookie.split(".");
    parts[2] = parts[2].replace(/.$/, parts[2].endsWith("a") ? "b" : "a");
    const replaced = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      cookieHeader: cookieHeaderFromSeal(parts.join(".")),
      secureCookie: false,
    });
    assert.equal(replaced.outcome, "minted");
    assert.notEqual(replaced.session.id, first.session.id);
  });

  it("unknown hash is rejected and replaced", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const orphanSecret = generateAnonSecret();
    const sealed = sealAnonCookieValue(orphanSecret, TEST_SECRET);
    const result = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      cookieHeader: cookieHeaderFromSeal(sealed),
      secureCookie: false,
    });
    assert.equal(result.outcome, "replaced");
    assert.notEqual(result.rawSecret, orphanSecret);
  });

  it("expired session is not restored", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const now = new Date("2026-01-01T00:00:00.000Z");
    const first = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      now,
      secureCookie: false,
    });
    const later = new Date("2026-02-01T00:00:00.000Z");
    const replaced = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      cookieHeader: cookieHeaderFromSeal(first.sealedCookie),
      now: later,
      secureCookie: false,
    });
    assert.equal(replaced.outcome, "replaced");
    assert.notEqual(replaced.session.id, first.session.id);
    const expired = await repo.getSession(first.session.id);
    assert.equal(expired && expired.status, "expired");
  });

  it("claimed session is not restored as anonymous", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const first = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      secureCookie: false,
    });
    // Simulate claim: member-linked + claimed status (removes anon restore).
    const claimed = (await repo.getSession(first.session.id));
    const mutated = {
      ...claimed,
      userId: "11111111-1111-1111-1111-111111111111",
      status: "claimed",
      claimedAt: new Date().toISOString(),
    };
    // Memory repo does not expose claim; overwrite via create collision path —
    // use markExpired-style by directly exercising lookup after status change
    // through a tiny fork: recreate repo state by appending via internal maps
    // is not exported, so use a wrapper repository.
    const wrapping = {
      ...repo,
      async getSessionByAnonKeyHash(hash) {
        const row = await repo.getSessionByAnonKeyHash(hash);
        if (row && row.id === first.session.id) return mutated;
        return row;
      },
      async getSession(id) {
        if (id === first.session.id) return mutated;
        return repo.getSession(id);
      },
      async createSession(input) {
        return repo.createSession(input);
      },
      async markExpiredIfPast(id, now) {
        return repo.markExpiredIfPast(id, now);
      },
      async listMessages(id) {
        return repo.listMessages(id);
      },
      async appendMessage(message) {
        return repo.appendMessage(message);
      },
      async getDraft(id) {
        return repo.getDraft(id);
      },
      async saveDraft(draft) {
        return repo.saveDraft(draft);
      },
    };

    const replaced = await ensureAnonAssistantCoachSession({
      repository: wrapping,
      cookieSecret: TEST_SECRET,
      cookieHeader: cookieHeaderFromSeal(first.sealedCookie),
      secureCookie: false,
    });
    assert.equal(replaced.outcome, "replaced");
    assert.notEqual(replaced.session.id, first.session.id);
    assert.equal(replaced.session.userId, null);
    assert.equal(replaced.session.status, "active");
  });

  it("malformed cookie does not throw / 500 at service layer", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const result = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      cookieHeader: `${ASSISTANT_COACH_ANON_COOKIE_NAME}=not-a-valid-cookie`,
      secureCookie: false,
    });
    assert.equal(result.outcome, "minted");
    assert.ok(result.session.id);
  });

  it("concurrent mint with the same anon hash resolves to one active session", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const raw = generateAnonSecret();
    const hash = hashAnonSecret(raw);
    const a = await repo.createSession({ anonKeyHash: hash });
    await assert.rejects(() => repo.createSession({ anonKeyHash: hash }));
    const found = await repo.getSessionByAnonKeyHash(hash);
    assert.equal(found?.id, a.id);
  });

  it("readCookieFromHeader extracts tf_ac_anon", () => {
    const sealed = sealAnonCookieValue(generateAnonSecret(), TEST_SECRET);
    const value = readCookieFromHeader(
      `other=1; ${ASSISTANT_COACH_ANON_COOKIE_NAME}=${sealed}; x=y`
    );
    assert.equal(value, sealed);
  });
});

describe("4B.3 supabase row mapping", () => {
  it("maps snake_case session rows without exposing raw secrets", () => {
    const mapped = mapSessionRow({
      id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee",
      anon_key_hash: "abc123",
      user_id: null,
      status: "active",
      turn_count: 0,
      has_experienced_value: false,
      expires_at: "2026-09-01T00:00:00.000Z",
      claimed_at: null,
      created_at: "2026-08-17T00:00:00.000Z",
      updated_at: "2026-08-17T00:00:00.000Z",
    });
    assert.equal(mapped.anonKeyHash, "abc123");
    assert.equal(mapped.userId, null);
    assert.equal(mapped.hasExperiencedValue, false);
  });
});

describe("4B.3 scope guards", () => {
  it("does not introduce guest revival or turn API in this package surface", async () => {
    const { readFileSync } = await import("node:fs");
    const { dirname, join } = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
    for (const rel of [
      "lib/assistant-coach/session-service.ts",
      "lib/assistant-coach/anon-cookie.ts",
      "app/api/assistant-coach/session/route.ts",
    ]) {
      const src = readFileSync(join(root, rel), "utf8");
      assert.doesNotMatch(src, /signInAnonymously|guest_/);
      assert.doesNotMatch(src, /runAssistantCoachTurn|openai|OpenAI/);
    }
  });
});
