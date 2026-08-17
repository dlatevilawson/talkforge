/**
 * Member reset must purge claimed Assistant Coach sessions.
 * Covers the 42P13 return-type upgrade (5-column prod → 6-column AC purge).
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migDir = join(root, "supabase/migrations");
const supersededName = "20260817_reset_purge_assistant_coach.sql";
const correctiveName =
  "20260817_reset_purge_assistant_coach_return_type.sql";
const baselineName = "20260803_atomic_member_data_reset.sql";

function stripSqlComments(sql) {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "");
}

describe("reset_my_talkforge_data Assistant Coach purge", () => {
  it("corrective deletes member-owned assistant_coach_sessions", () => {
    const sql = readFileSync(join(migDir, correctiveName), "utf8");
    assert.match(
      sql,
      /delete from public\.assistant_coach_sessions\s+where user_id = member_id/i
    );
    assert.match(sql, /assistant_coach_sessions_deleted/);
    assert.match(
      sql,
      /Unclaimed anon AC sessions are not member-owned/i
    );
  });

  it("is registered after the AC session schema on both paths", () => {
    const manifest = JSON.parse(
      readFileSync(join(root, "supabase/migrations/manifest.json"), "utf8")
    );
    for (const pathName of ["greenfield", "existingProduction"]) {
      const files = manifest.deploymentPaths[pathName];
      const iSessions = files.indexOf(
        "20260817_assistant_coach_anon_sessions.sql"
      );
      const iSuperseded = files.indexOf(supersededName);
      const iCorrective = files.indexOf(correctiveName);
      assert.ok(iSessions >= 0, `${pathName} missing AC sessions migration`);
      assert.ok(
        iSuperseded > iSessions,
        `${pathName} superseded reset marker must follow AC tables`
      );
      assert.ok(
        iCorrective > iSuperseded,
        `${pathName} return-type corrective must follow superseded marker`
      );
    }
  });

  it("schema snapshot includes the AC purge and extended return column", () => {
    const schema = readFileSync(join(root, "supabase/schema.sql"), "utf8");
    assert.match(
      schema,
      /delete from public\.assistant_coach_sessions\s+where user_id = member_id/i
    );
    assert.match(schema, /assistant_coach_sessions_deleted bigint/);
    assert.match(
      schema,
      /grant execute on function public\.reset_my_talkforge_data\(\) to service_role/i
    );
  });

  it("deploy check pins equivalence to the return-type corrective", () => {
    const check = readFileSync(
      join(root, "scripts/check-supabase-deployment.mjs"),
      "utf8"
    );
    assert.match(
      check,
      /20260817_reset_purge_assistant_coach_return_type\.sql/
    );
    assert.doesNotMatch(
      check,
      /resetMigration = migrationSql\.get\(\s*"20260803_atomic_member_data_reset\.sql"/
    );
  });
});

describe("4B.2 return-type upgrade (5-column → AC purge)", () => {
  it("production baseline is the 5-column function without AC purge", () => {
    const baseline = readFileSync(join(migDir, baselineName), "utf8");
    assert.match(
      baseline,
      /returns table \(\s*living_profiles_deleted bigint,\s*coach_memory_deleted bigint,\s*practice_sessions_deleted bigint,\s*session_reports_deleted bigint,\s*reflections_deleted bigint\s*\)/i
    );
    assert.doesNotMatch(baseline, /assistant_coach_sessions_deleted/);
    assert.doesNotMatch(
      baseline,
      /delete from public\.assistant_coach_sessions/i
    );
    assert.doesNotMatch(
      baseline,
      /drop function .*reset_my_talkforge_data/i
    );
  });

  it("failed CREATE OR REPLACE form is preserved only as audit comment", () => {
    const superseded = readFileSync(join(migDir, supersededName), "utf8");
    assert.match(superseded, /SUPERSEDED/i);
    assert.match(superseded, /42P13/);
    assert.match(superseded, /NOT applied/i);
    assert.match(
      superseded,
      /create or replace function public\.reset_my_talkforge_data/i
    );
    const executable = stripSqlComments(superseded);
    assert.doesNotMatch(
      executable,
      /create or replace function public\.reset_my_talkforge_data/i
    );
    assert.doesNotMatch(
      executable,
      /drop\s+function\s+(if\s+exists\s+)?public\.reset_my_talkforge_data/i
    );
  });

  it("corrective DROPs before recreate so RETURNS TABLE can change", () => {
    const corrective = readFileSync(join(migDir, correctiveName), "utf8");
    const dropIdx = corrective.search(
      /drop function if exists public\.reset_my_talkforge_data\s*\(\s*\)/i
    );
    const createIdx = corrective.search(
      /create or replace function public\.reset_my_talkforge_data\s*\(/i
    );
    assert.ok(dropIdx >= 0, "missing DROP FUNCTION");
    assert.ok(createIdx > dropIdx, "CREATE must follow DROP");
    assert.match(
      corrective,
      /returns table \([\s\S]*assistant_coach_sessions_deleted bigint[\s\S]*\)/i
    );
    assert.match(
      corrective,
      /grant execute on function public\.reset_my_talkforge_data\(\) to service_role/i
    );
    assert.match(
      corrective,
      /revoke all on function public\.reset_my_talkforge_data\(\) from anon/i
    );
  });

  it("upgrade sequence from baseline to corrective is ordered and complete", () => {
    const manifest = JSON.parse(
      readFileSync(join(root, "supabase/migrations/manifest.json"), "utf8")
    );
    for (const pathName of ["greenfield", "existingProduction"]) {
      const files = manifest.deploymentPaths[pathName];
      const iBaseline = files.indexOf(baselineName);
      const iCorrective = files.indexOf(correctiveName);
      assert.ok(iBaseline >= 0, `${pathName} missing baseline reset`);
      assert.ok(
        iCorrective > iBaseline,
        `${pathName} corrective must follow 5-column baseline`
      );
    }

    const baseline = readFileSync(join(migDir, baselineName), "utf8");
    const corrective = readFileSync(join(migDir, correctiveName), "utf8");

    // Simulate the Postgres constraint that blocked production: CREATE OR REPLACE
    // alone cannot change OUT/RETURNS TABLE shape. The corrective must DROP first.
    const replaceOnly = /create or replace function public\.reset_my_talkforge_data/i;
    assert.match(baseline, replaceOnly);
    assert.doesNotMatch(
      baseline,
      /drop function .*reset_my_talkforge_data/i
    );
    assert.match(
      corrective,
      /drop function if exists public\.reset_my_talkforge_data\s*\(\s*\)[\s\S]*create or replace function public\.reset_my_talkforge_data/i
    );

    // Result shape upgrade: 5 cols → 6 cols including AC purge count.
    assert.doesNotMatch(baseline, /assistant_coach_sessions_deleted/);
    assert.match(corrective, /assistant_coach_sessions_deleted bigint/);
  });
});
