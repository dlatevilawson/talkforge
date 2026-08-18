/**
 * Phase 4B.2 — migration + in-memory session repository tests.
 */
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

describe("4B.2 migration + manifest", () => {
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

describe("4B.2 memory repository", () => {
  it("defaults TTL to 14 days and stores a profile draft", async () => {
    assert.equal(ASSISTANT_COACH_ANON_TTL_DAYS, 14);
    const now = new Date("2026-08-16T12:00:00.000Z");
    const repo = createMemoryAssistantCoachSessionRepository();
    const session = await repo.createSession({
      anonKeyHash: "hash_a",
      now,
      profileJson: {
        evidenceLedger: [],
        profileInsights: [],
        purposeStatement: "",
      },
    });
    assert.equal(session.status, "active");
    assert.equal(session.userId, null);
    assert.equal(session.hasExperiencedValue, false);
    assert.equal(
      session.expiresAt,
      defaultAnonExpiresAt(now, 14).toISOString()
    );
    const draft = await repo.getDraft(session.id);
    assert.ok(draft);
    assert.deepEqual(draft.profileJson.evidenceLedger, []);
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

  it("updates draft profile_json without touching living_profiles APIs", async () => {
    const repo = createMemoryAssistantCoachSessionRepository();
    const session = await repo.createSession({ anonKeyHash: "hash_draft" });
    const saved = await repo.saveDraft({
      sessionId: session.id,
      version: 2,
      profileJson: {
        evidenceLedger: [{ id: "pev_1", category: "communication_friction" }],
        profileInsights: [],
      },
    });
    assert.equal(saved.version, 2);
    assert.ok(Array.isArray(saved.profileJson.evidenceLedger));
    assert.equal(saved.profileJson.evidenceLedger.length, 1);
  });
});
