/**
 * Member reset must purge claimed Assistant Coach sessions before prod AC data.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migName = "20260817_reset_purge_assistant_coach.sql";

describe("reset_my_talkforge_data Assistant Coach purge", () => {
  it("migration deletes member-owned assistant_coach_sessions", () => {
    const sql = readFileSync(join(root, "supabase/migrations", migName), "utf8");
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
      const iReset = files.indexOf(migName);
      assert.ok(iSessions >= 0, `${pathName} missing AC sessions migration`);
      assert.ok(iReset > iSessions, `${pathName} reset must follow AC tables`);
    }
  });

  it("schema snapshot includes the AC purge and extended return column", () => {
    const schema = readFileSync(join(root, "supabase/schema.sql"), "utf8");
    assert.match(
      schema,
      /delete from public\.assistant_coach_sessions\s+where user_id = member_id/i
    );
    assert.match(schema, /assistant_coach_sessions_deleted bigint/);
  });

  it("deploy check pins equivalence to the new reset migration", () => {
    const check = readFileSync(
      join(root, "scripts/check-supabase-deployment.mjs"),
      "utf8"
    );
    assert.match(check, /20260817_reset_purge_assistant_coach\.sql/);
    assert.doesNotMatch(
      check,
      /resetMigration = migrationSql\.get\(\s*"20260803_atomic_member_data_reset\.sql"/
    );
  });
});
