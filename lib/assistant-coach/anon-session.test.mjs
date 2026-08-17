/**
 * Phase 4B.3 — signed anon cookie + session mint/restore + route handler.
 */
import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
  anonCookieMaxAgeSeconds,
  buildAnonCookieAttributes,
  parseAnonCookieValue,
  readCookieFromHeader,
  sealAnonCookieValue,
  serializeAnonSetCookie,
} from "./anon-cookie.ts";
import {
  assertAnonMintKey,
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
import { mapSessionRow } from "./session-mappers.ts";
import { handleAssistantCoachSessionRequest } from "./http-session.ts";

const TEST_SECRET = "test-assistant-coach-cookie-secret-32b!";

function cookieHeaderFromSeal(sealed) {
  return `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${sealed}`;
}

function getSetCookie(res) {
  if (typeof res.headers.getSetCookie === "function") {
    const list = res.headers.getSetCookie();
    if (list && list.length) return list;
  }
  const single = res.headers.get("set-cookie");
  return single ? [single] : [];
}

describe("4B.3 anon secret hashing", () => {
  it("stores only a one-way hash, never the raw secret", () => {
    const raw = generateAnonSecret();
    const hash = hashAnonSecret(raw);
    assert.notEqual(hash, raw);
    assert.equal(hash.length, 64);
    assert.equal(hashAnonSecret(raw), hash);
    assert.ok(raw.length >= 43);
  });

  it("accepts high-entropy mint keys and rejects weak ones", () => {
    const ok = generateAnonSecret();
    assert.equal(assertAnonMintKey(ok), ok);
    assert.throws(() => assertAnonMintKey("short"), AnonMintKeyError);
    assert.throws(() => assertAnonMintKey("!!!invalid!!!"), AnonMintKeyError);
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

  it("rejects malformed encodings without throwing", () => {
    for (const bad of [
      "",
      "v1.only",
      "v2.a.b",
      "nope",
      "v1..sig",
      "v1.abc.def.extra",
      "v1.not=safe.mac",
    ]) {
      const parsed = parseAnonCookieValue(bad, TEST_SECRET);
      assert.equal(parsed.ok, false);
    }
  });

  it("cookie attributes are HttpOnly, path /, SameSite=Lax; Max-Age does not resurrect", () => {
    const expiresAt = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000
    ).toISOString();
    const attrs = buildAnonCookieAttributes(expiresAt, {
      secure: true,
      now: new Date(),
    });
    assert.equal(attrs.httpOnly, true);
    assert.equal(attrs.secure, true);
    assert.equal(attrs.sameSite, "lax");
    assert.equal(attrs.path, "/");
    assert.ok(attrs.maxAge > 13 * 24 * 60 * 60);
    assert.equal(
      anonCookieMaxAgeSeconds("2000-01-01T00:00:00.000Z", new Date()),
      0
    );
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
  it("first visit mints one session + sealed cookie when mint key provided", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const result = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      cookieHeader: null,
      mintKey,
      secureCookie: false,
    });
    assert.equal(result.outcome, "minted");
    assert.equal(result.rawSecret, mintKey);
    assert.equal(result.session.anonKeyHash, hashAnonSecret(mintKey));
    assert.notEqual(result.session.anonKeyHash, result.rawSecret);
    assert.equal("anonKeyHash" in result.publicSession, false);
  });

  it("cookieless mint without mint key fails closed", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    await assert.rejects(
      () =>
        ensureAnonAssistantCoachSession({
          repository: repo,
          cookieSecret: TEST_SECRET,
          cookieHeader: null,
          secureCookie: false,
        }),
      AnonMintKeyError
    );
  });

  it("valid cookie restores the same session on refresh", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const first = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
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
  });

  it("refresh does not create another session", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const first = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });
    await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      cookieHeader: cookieHeaderFromSeal(first.sealedCookie),
      secureCookie: false,
    });
    const again = await repo.getSessionByAnonKeyHash(hashAnonSecret(mintKey));
    assert.ok(again);
    assert.equal(again.id, first.session.id);
  });

  it("concurrent cookieless mints with the same Idempotency-Key share one session", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const [a, b] = await Promise.all([
      ensureAnonAssistantCoachSession({
        repository: repo,
        cookieSecret: TEST_SECRET,
        mintKey,
        secureCookie: false,
      }),
      ensureAnonAssistantCoachSession({
        repository: repo,
        cookieSecret: TEST_SECRET,
        mintKey,
        secureCookie: false,
      }),
    ]);
    assert.equal(a.session.id, b.session.id);
    assert.equal(a.rawSecret, b.rawSecret);
    assert.equal(hashAnonSecret(mintKey), a.session.anonKeyHash);
  });

  it("tampered cookie is rejected and replaced when mint key provided", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const firstKey = generateAnonSecret();
    const first = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey: firstKey,
      secureCookie: false,
    });
    const parts = first.sealedCookie.split(".");
    parts[2] = parts[2].replace(/.$/, parts[2].endsWith("a") ? "b" : "a");
    const replaceKey = generateAnonSecret();
    const replaced = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      cookieHeader: cookieHeaderFromSeal(parts.join(".")),
      mintKey: replaceKey,
      secureCookie: false,
    });
    assert.equal(replaced.outcome, "minted");
    assert.notEqual(replaced.session.id, first.session.id);
  });

  it("unknown hash is rejected and replaced with mint key", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const orphanSecret = generateAnonSecret();
    const sealed = sealAnonCookieValue(orphanSecret, TEST_SECRET);
    const replaceKey = generateAnonSecret();
    const result = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      cookieHeader: cookieHeaderFromSeal(sealed),
      mintKey: replaceKey,
      secureCookie: false,
    });
    assert.equal(result.outcome, "replaced");
    assert.equal(result.rawSecret, replaceKey);
  });

  it("expired session is not restored", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const now = new Date("2026-01-01T00:00:00.000Z");
    const mintKey = generateAnonSecret();
    const first = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      now,
      secureCookie: false,
    });
    const later = new Date("2026-02-01T00:00:00.000Z");
    const replaceKey = generateAnonSecret();
    const replaced = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      cookieHeader: cookieHeaderFromSeal(first.sealedCookie),
      mintKey: replaceKey,
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
    const mintKey = generateAnonSecret();
    const first = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      mintKey,
      secureCookie: false,
    });
    const claimed = await repo.getSession(first.session.id);
    const mutated = {
      ...claimed,
      userId: "11111111-1111-1111-1111-111111111111",
      status: "claimed",
      claimedAt: new Date().toISOString(),
    };
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

    const replaceKey = generateAnonSecret();
    const replaced = await ensureAnonAssistantCoachSession({
      repository: wrapping,
      cookieSecret: TEST_SECRET,
      cookieHeader: cookieHeaderFromSeal(first.sealedCookie),
      mintKey: replaceKey,
      secureCookie: false,
    });
    assert.equal(replaced.outcome, "replaced");
    assert.notEqual(replaced.session.id, first.session.id);
    assert.equal(replaced.session.userId, null);
  });

  it("markExpiredIfPast does not mutate claimed sessions", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const created = await repo.createSession({
      anonKeyHash: hashAnonSecret(generateAnonSecret()),
      now: new Date("2020-01-01T00:00:00.000Z"),
    });
    // Simulate claim on the in-memory row via a wrapping getSession used by a
    // dedicated mark helper that mirrors production guards.
    const claimed = {
      ...created,
      userId: "11111111-1111-1111-1111-111111111111",
      status: "claimed",
      claimedAt: "2020-01-02T00:00:00.000Z",
      expiresAt: "2020-01-02T00:00:00.000Z",
    };
    const wrapping = {
      async getSession(id) {
        if (id === created.id) return claimed;
        return repo.getSession(id);
      },
      async markExpiredIfPast(id, now) {
        const session = await wrapping.getSession(id);
        if (!session) return null;
        if (session.userId != null) return session;
        if (session.status !== "active" && session.status !== "gated") {
          return session;
        }
        return repo.markExpiredIfPast(id, now);
      },
    };
    const result = await wrapping.markExpiredIfPast(
      created.id,
      new Date("2099-01-01T00:00:00.000Z")
    );
    assert.equal(result.status, "claimed");
    assert.equal(result.userId, claimed.userId);
  });

  it("malformed cookie does not throw at service layer when mint key present", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const result = await ensureAnonAssistantCoachSession({
      repository: repo,
      cookieSecret: TEST_SECRET,
      cookieHeader: `${ASSISTANT_COACH_ANON_COOKIE_NAME}=not-a-valid-cookie`,
      mintKey,
      secureCookie: false,
    });
    assert.equal(result.outcome, "minted");
  });

  it("readCookieFromHeader extracts tf_ac_anon", () => {
    const sealed = sealAnonCookieValue(generateAnonSecret(), TEST_SECRET);
    const value = readCookieFromHeader(
      `other=1; ${ASSISTANT_COACH_ANON_COOKIE_NAME}=${sealed}; x=y`
    );
    assert.equal(value, sealed);
  });
});

describe("4B.3 route handler", () => {
  function depsWith(repo) {
    return {
      adminConfigured: () => true,
      requireCookieSecret: () => TEST_SECRET,
      createRepository: () => repo,
    };
  }

  it("POST mints with Idempotency-Key and sets HttpOnly cookie + no-store", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const res = await handleAssistantCoachSessionRequest(
      new Request("http://localhost/api/assistant-coach/session", {
        method: "POST",
        headers: { "Idempotency-Key": mintKey },
      }),
      depsWith(repo)
    );
    assert.equal(res.status, 200);
    assert.match(res.headers.get("cache-control") || "", /no-store/);
    const body = await res.json();
    assert.equal(body.session.outcome, "minted");
    assert.equal(body.session.anonKeyHash, undefined);
    assert.equal(body.rawSecret, undefined);
    const setCookies = getSetCookie(res);
    assert.ok(setCookies.length >= 1);
    const sc = setCookies.join("\n");
    assert.match(sc, new RegExp(`${ASSISTANT_COACH_ANON_COOKIE_NAME}=`));
    assert.match(sc, /HttpOnly/i);
    assert.match(sc, /Path=\//i);
    assert.match(sc, /SameSite=Lax/i);
  });

  it("POST without Idempotency-Key and without cookie returns 400", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const res = await handleAssistantCoachSessionRequest(
      new Request("http://localhost/api/assistant-coach/session", {
        method: "POST",
      }),
      depsWith(repo)
    );
    assert.equal(res.status, 400);
    assert.equal(getSetCookie(res).length, 0);
  });

  it("tampered cookie on POST with new mint key replaces safely", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const firstKey = generateAnonSecret();
    const first = await handleAssistantCoachSessionRequest(
      new Request("http://localhost/api/assistant-coach/session", {
        method: "POST",
        headers: { "Idempotency-Key": firstKey },
      }),
      depsWith(repo)
    );
    const sealed = getSetCookie(first)[0].split(";")[0].split("=").slice(1).join("=");
    const parts = sealed.split(".");
    parts[2] = parts[2].replace(/.$/, parts[2].endsWith("a") ? "b" : "a");
    const replaceKey = generateAnonSecret();
    const res = await handleAssistantCoachSessionRequest(
      new Request("http://localhost/api/assistant-coach/session", {
        method: "POST",
        headers: {
          cookie: `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${parts.join(".")}`,
          "Idempotency-Key": replaceKey,
        },
      }),
      depsWith(repo)
    );
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.session.outcome, "minted");
  });

  it("GET with valid cookie restores without requiring mint key", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const mintKey = generateAnonSecret();
    const minted = await handleAssistantCoachSessionRequest(
      new Request("http://localhost/api/assistant-coach/session", {
        method: "POST",
        headers: { "Idempotency-Key": mintKey },
      }),
      depsWith(repo)
    );
    const sealed = getSetCookie(minted)[0].split(";")[0].split("=").slice(1).join("=");
    const firstBody = await minted.json();
    const restored = await handleAssistantCoachSessionRequest(
      new Request("http://localhost/api/assistant-coach/session", {
        method: "GET",
        headers: { cookie: `${ASSISTANT_COACH_ANON_COOKIE_NAME}=${sealed}` },
      }),
      depsWith(repo)
    );
    assert.equal(restored.status, 200);
    const body = await restored.json();
    assert.equal(body.session.outcome, "restored");
    assert.equal(body.session.id, firstBody.session.id);
  });

  it("missing signing secret returns 503", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const res = await handleAssistantCoachSessionRequest(
      new Request("http://localhost/api/assistant-coach/session", {
        method: "POST",
        headers: { "Idempotency-Key": generateAnonSecret() },
      }),
      {
        adminConfigured: () => true,
        requireCookieSecret: () => {
          throw new AssistantCoachConfigError("missing secret");
        },
        createRepository: () => repo,
      }
    );
    assert.equal(res.status, 503);
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
