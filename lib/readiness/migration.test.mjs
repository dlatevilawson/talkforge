import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const migration = readFileSync(
  join(
    root,
    "supabase/migrations/20260923055820_readiness_measurement_foundation.sql"
  ),
  "utf8"
);
const shadowMigration = readFileSync(
  join(
    root,
    "supabase/migrations/20260923223520_readiness_shadow_audit.sql"
  ),
  "utf8"
);

describe("readiness measurement migration", () => {
  it("keeps assessments attached to the same member-owned session", () => {
    assert.match(
      migration,
      /foreign key \(session_id, user_id\)[\s\S]*references public\.practice_sessions \(id, user_id\)[\s\S]*on delete cascade/i
    );
  });

  it("stores null separately from a demonstrated level", () => {
    assert.match(migration, /level smallint check \(level between 0 and 4\)/i);
    assert.match(migration, /null_reason text/i);
    assert.match(
      migration,
      /level is null[\s\S]*null_reason is not null[\s\S]*evidence_strength = 'insufficient'/i
    );
  });

  it("allows multiple evidence references per signal", () => {
    assert.match(migration, /create table if not exists public\.session_readiness_evidence/i);
    assert.match(
      migration,
      /evidence_type in \('support', 'friction', 'recovery', 'breakdown'\)/i
    );
  });

  it("makes readiness rows service-only for the authorized shadow phase", () => {
    for (const table of [
      "session_readiness_assessments",
      "session_readiness_signals",
      "session_readiness_evidence",
    ]) {
      assert.match(
        migration,
        new RegExp(`alter table public\\.${table} enable row level security`, "i")
      );
      assert.match(
        migration,
        new RegExp(`grant all on table public\\.${table} to service_role`, "i")
      );
      assert.match(
        shadowMigration,
        new RegExp(
          `revoke all on table public\\.${table}[\\s\\S]*from public, anon, authenticated`,
          "i"
        )
      );
    }
    assert.doesNotMatch(migration, /for (insert|update|delete)[\s\S]*to authenticated/i);
  });

  it("reserves a private audit identity before each model call", () => {
    assert.match(
      shadowMigration,
      /create table if not exists public\.session_readiness_shadow_runs/i
    );
    assert.match(
      shadowMigration,
      /unique \(session_id, rubric_version, assessment_revision\)/i
    );
    assert.match(
      shadowMigration,
      /status in \('pending', 'completed', 'failed'\)/i
    );
    assert.match(shadowMigration, /input_tokens integer/i);
    assert.match(shadowMigration, /output_tokens integer/i);
    assert.match(
      shadowMigration,
      /revoke all on table public\.session_readiness_shadow_runs[\s\S]*from public, anon, authenticated/i
    );
    assert.match(
      shadowMigration,
      /grant all on table public\.session_readiness_shadow_runs to service_role/i
    );
  });

  it("does not change the six-column reset contract", () => {
    assert.doesNotMatch(migration, /reset_my_talkforge_data/i);
    assert.doesNotMatch(shadowMigration, /reset_my_talkforge_data/i);
  });
});
