/** Deployment compatibility and retained preview repository tests. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

import {
  ASSISTANT_COACH_ANON_TTL_DAYS,
  createMemoryAssistantCoachSessionRepository,
  defaultAnonExpiresAt,
  isAnonSessionExpired,
} from "./session-repository.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migrationName = "20260817_assistant_coach_anon_sessions.sql";

describe("session substrate migration compatibility", () => {
  it("creates the three tables with 14-day TTL default", () => {
    const sql = readFileSync(
      join(root, "supabase/migrations", migrationName),
      "utf8"
    );
    assert.match(sql, /create table if not exists public\.assistant_coach_sessions/);
    assert.match(sql, /create table if not exists public\.assistant_coach_messages/);
    assert.match(
      sql,
      /create table if not exists public\.assistant_coach_profile_drafts/
    );
    assert.match(sql, /interval '14 days'/);
    assert.match(sql, /has_experienced_value boolean not null default false/);
    assert.match(sql, /anon_key_hash/);
    assert.match(sql, /profile_json jsonb/);
    assert.match(sql, /model_meta jsonb/);
  });

  it("enforces service-role-only access model", () => {
    const sql = readFileSync(
      join(root, "supabase/migrations", migrationName),
      "utf8"
    );
    assert.match(sql, /enable row level security/);
    assert.match(
      sql,
      /revoke all on table public\.assistant_coach_sessions from anon, authenticated/
    );
    assert.match(
      sql,
      /revoke all on table public\.assistant_coach_messages from anon, authenticated/
    );
    assert.match(
      sql,
      /revoke all on table public\.assistant_coach_profile_drafts from anon, authenticated/
    );
    assert.match(sql, /grant all on table public\.assistant_coach_sessions to service_role/);
    assert.doesNotMatch(sql, /create policy/);
  });

  it("indexes expires_at, user_id, and unique active anon_key_hash", () => {
    const sql = readFileSync(
      join(root, "supabase/migrations", migrationName),
      "utf8"
    );
    assert.match(sql, /assistant_coach_sessions_expires_at_idx/);
    assert.match(sql, /assistant_coach_sessions_user_id_idx/);
    assert.match(sql, /assistant_coach_sessions_anon_key_hash_active_uidx/);
    assert.match(sql, /status in \('active', 'gated'\)/);
  });

  it("is registered on both deployment paths after 4B.1", () => {
    const manifest = JSON.parse(
      readFileSync(join(root, "supabase/migrations/manifest.json"), "utf8")
    );
    for (const pathName of ["greenfield", "existingProduction"]) {
      const files = manifest.deploymentPaths[pathName];
      assert.ok(files.includes(migrationName), pathName);
      const i4b1 = files.indexOf(
        "20260816_living_profile_evidence_insights.sql"
      );
      const i4b2 = files.indexOf(migrationName);
      assert.ok(i4b1 >= 0 && i4b2 > i4b1, `${pathName} order`);
    }
  });

  it("reference schema snapshot includes the tables", () => {
    const schema = readFileSync(join(root, "supabase/schema.sql"), "utf8");
    assert.match(schema, /assistant_coach_sessions/);
    assert.match(schema, /assistant_coach_messages/);
    assert.match(schema, /assistant_coach_profile_drafts/);
    assert.match(schema, /revoke all on table public\.assistant_coach_sessions/);
  });
});

describe("memory preview repository", () => {
  it("defaults TTL to 14 days and stores preview state", async () => {
    assert.equal(ASSISTANT_COACH_ANON_TTL_DAYS, 14);
    const now = new Date("2026-08-16T12:00:00.000Z");
    const repo = createMemoryAssistantCoachSessionRepository();
    const session = await repo.createSession({
      anonKeyHash: "hash_a",
      now,
      profileJson: {
        forgePreview: { status: "unused" },
      },
    });
    assert.equal(session.status, "active");
    assert.equal(session.userId, null);
    assert.equal(
      session.expiresAt,
      defaultAnonExpiresAt(now, 14).toISOString()
    );
    const draft = await repo.getDraft(session.id);
    assert.ok(draft);
    assert.deepEqual(draft.profileJson.forgePreview, { status: "unused" });
    assert.equal(draft.version, 1);
  });

  it("enforces unique active anon_key_hash", async () => {
    const { AssistantCoachUniqueConflictError } = await import(
      "./session-repository.ts"
    );
    const repo = createMemoryAssistantCoachSessionRepository();
    await repo.createSession({ anonKeyHash: "hash_dup" });
    await assert.rejects(
      () => repo.createSession({ anonKeyHash: "hash_dup" }),
      (err) =>
        err instanceof AssistantCoachUniqueConflictError &&
        err.anonKeyHash === "hash_dup"
    );
  });

  it("restores and normalizes legacy gated rows without gate semantics", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const historical = await repo.seedLegacyGatedSession({
      anonKeyHash: "hash_legacy_gated",
    });
    const restored = await repo.getSessionByAnonKeyHash("hash_legacy_gated");
    assert.equal(restored?.id, historical.id);
    assert.equal(restored?.status, "gated");
    assert.equal("hasExperiencedValue" in restored, false);

    const normalized = await repo.normalizeLegacyGatedSession(historical.id);
    assert.equal(normalized.status, "active");
    assert.equal(normalized.userId, null);
  });

  it("expires historical gated rows instead of stranding their unique key", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const historical = await repo.seedLegacyGatedSession({
      anonKeyHash: "hash_expired_legacy_gated",
      now: new Date("2026-08-01T00:00:00.000Z"),
    });
    const expired = await repo.markExpiredIfPast(
      historical.id,
      new Date("2026-08-16T00:00:00.000Z")
    );
    assert.equal(expired?.status, "expired");
    assert.equal(
      await repo.getSessionByAnonKeyHash("hash_expired_legacy_gated"),
      null
    );
  });

  it("appends messages and bumps turn_count on user turns", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const session = await repo.createSession({ anonKeyHash: "hash_msg" });
    await repo.appendMessage({
      sessionId: session.id,
      turnIndex: 0,
      role: "assistant",
      content: "Hello",
      modelMeta: {},
    });
    await repo.appendMessage({
      sessionId: session.id,
      turnIndex: 1,
      role: "user",
      content: "I freeze in meetings",
      modelMeta: {},
    });
    const again = await repo.getSession(session.id);
    assert.equal(again?.turnCount, 1);
    const msgs = await repo.listMessages(session.id);
    assert.equal(msgs.length, 2);
    await assert.rejects(
      () =>
        repo.appendMessage({
          sessionId: session.id,
          turnIndex: 1,
          role: "user",
          content: "dup",
          modelMeta: {},
        }),
      /duplicate/
    );
  });

  it("marks expired sessions and clears active anon index", async () => {
    const createdAt = new Date("2026-08-01T00:00:00.000Z");
    const repo = createMemoryAssistantCoachSessionRepository();
    const session = await repo.createSession({
      anonKeyHash: "hash_exp",
      now: createdAt,
      ttlDays: 14,
    });
    const stillActive = await repo.markExpiredIfPast(
      session.id,
      new Date("2026-08-10T00:00:00.000Z")
    );
    assert.equal(stillActive?.status, "active");
    assert.equal(isAnonSessionExpired(session, new Date("2026-08-10T00:00:00.000Z")), false);

    const expired = await repo.markExpiredIfPast(
      session.id,
      new Date("2026-08-20T00:00:00.000Z")
    );
    assert.equal(expired?.status, "expired");
    assert.equal(await repo.getSessionByAnonKeyHash("hash_exp"), null);
  });

  it("updates server-owned preview JSON", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const session = await repo.createSession({ anonKeyHash: "hash_draft" });
    const saved = await repo.saveDraft({
      sessionId: session.id,
      version: 2,
      profileJson: {
        forgePreview: { status: "active", topicId: "interview" },
      },
    });
    assert.equal(saved.version, 2);
    assert.deepEqual(saved.profileJson.forgePreview, {
      status: "active",
      topicId: "interview",
    });
  });
});

describe("Supabase legacy-status repository contract", () => {
  it("restores, expires, and atomically heals gated anonymous rows", () => {
    const source = readFileSync(
      join(root, "lib/assistant-coach/supabase-session-repository.ts"),
      "utf8"
    );
    assert.match(source, /\.in\("status", \["active", "gated"\]\)/);
    assert.match(
      source,
      /session\.status !== "active" && session\.status !== "gated"/
    );
    assert.match(source, /async normalizeLegacyGatedSession/);
    assert.match(source, /\.eq\("status", "gated"\)/);
    assert.match(source, /\.is\("user_id", null\)/);
    assert.match(source, /\.gt\("expires_at", now\.toISOString\(\)\)/);
  });
});
