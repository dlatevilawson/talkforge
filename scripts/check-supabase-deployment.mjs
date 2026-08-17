/**
 * HARDEN-004 deployment-integrity gate.
 *
 * Verifies the migration manifest, effective security trigger, bounded schema
 * snapshot, and retired one-off deployment helpers without touching a database.
 */

import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

const root = process.cwd();
const migrationsDir = resolve(root, "supabase/migrations");
const manifest = JSON.parse(
  await readFile(resolve(migrationsDir, "manifest.json"), "utf8")
);

function normalizeSql(value) {
  return value.replace(/--.*$/gm, "").replace(/\s+/g, " ").trim();
}

function extractFunction(sql, name, delimiter = "\\$\\$") {
  const pattern = new RegExp(
    `create or replace function public\\.${name}\\(\\)[\\s\\S]*?${delimiter};`
  );
  const match = sql.match(pattern);
  assert.ok(match, `${name} definition is missing`);
  return match[0];
}

function assertUnique(values, label) {
  assert.equal(
    new Set(values).size,
    values.length,
    `${label} contains a duplicate migration`
  );
}

function assertEffectiveRoleSecurity(deploymentPaths, sqlByFile) {
  for (const [pathName, orderedFiles] of Object.entries(deploymentPaths)) {
    const triggerDefinitions = orderedFiles
      .map((name) => ({ name, sql: sqlByFile.get(name) }))
      .filter(({ sql }) =>
        sql.includes("create or replace function public.handle_new_user()")
      );
    assert.ok(
      triggerDefinitions.length > 0,
      `${pathName} never installs handle_new_user()`
    );
    const effective = triggerDefinitions.at(-1);
    assert.match(
      effective.sql,
      /raw_app_meta_data->>'role'/,
      `${pathName} effective trigger does not use app metadata`
    );
    assert.doesNotMatch(
      effective.sql,
      /raw_user_meta_data->>'role'/,
      `${pathName} effective trigger trusts user metadata role`
    );
  }
}

const migrationFiles = (await readdir(migrationsDir))
  .filter((name) => name.endsWith(".sql"))
  .sort();
const paths = manifest.deploymentPaths;
const greenfield = paths.greenfield;
const existingProduction = paths.existingProduction;

assert.equal(manifest.deploymentSourceOfTruth, "supabase/migrations");
assert.equal(manifest.referenceSnapshot.path, "supabase/schema.sql");
assert.equal(manifest.referenceSnapshot.deployable, false);
assertUnique(greenfield, "greenfield");
assertUnique(existingProduction, "existingProduction");

const covered = [...new Set([...greenfield, ...existingProduction])].sort();
assert.deepEqual(
  covered,
  migrationFiles,
  "manifest paths must cover every SQL migration"
);

assert.deepEqual(greenfield.slice(0, 2), [
  "20260729_auth_foundation.sql",
  manifest.securityInvariants.greenfieldSecureRoleMigration,
]);
assert.equal(
  existingProduction[0],
  manifest.securityInvariants.existingProductionSecureRoleMigration
);
assert.ok(!greenfield.includes("20260730_upgrade_legacy_profiles.sql"));
assert.ok(!existingProduction.includes("20260729_auth_foundation.sql"));
assert.ok(
  !existingProduction.includes("20260729_tip_secure_role_trigger.sql")
);

const migrationSql = new Map(
  await Promise.all(
    migrationFiles.map(async (name) => [
      name,
      await readFile(resolve(migrationsDir, name), "utf8"),
    ])
  )
);

assertEffectiveRoleSecurity(paths, migrationSql);

const snapshot = await readFile(
  resolve(root, manifest.referenceSnapshot.path),
  "utf8"
);
assert.match(snapshot, /^-- NON-DEPLOYABLE REFERENCE SNAPSHOT/);
assert.doesNotMatch(snapshot, /raw_user_meta_data->>'role'/);
assert.match(snapshot, /raw_app_meta_data->>'role'/);

const secureTrigger = migrationSql.get(
  manifest.securityInvariants.greenfieldSecureRoleMigration
);
assert.equal(
  normalizeSql(extractFunction(snapshot, "handle_new_user")),
  normalizeSql(extractFunction(secureTrigger, "handle_new_user")),
  "snapshot handle_new_user() drifted from the secure migration"
);

const resetMigration = migrationSql.get(
  "20260817_reset_purge_assistant_coach.sql"
);
assert.ok(
  resetMigration,
  "reset purge migration 20260817_reset_purge_assistant_coach.sql missing from migrations dir"
);
assert.equal(
  normalizeSql(
    extractFunction(snapshot, "reset_my_talkforge_data", "\\$function\\$")
  ),
  normalizeSql(
    extractFunction(resetMigration, "reset_my_talkforge_data", "\\$function\\$")
  ),
  "snapshot reset_my_talkforge_data() drifted from its migration"
);
assert.match(
  resetMigration,
  /delete from public\.assistant_coach_sessions\s+where user_id = member_id/i
);
assert.match(
  resetMigration,
  /assistant_coach_sessions_deleted/
);
assert.match(
  snapshot,
  /constraint living_profiles_version_positive check \(version >= 1\)/
);
assert.match(snapshot, /'challenge_first'/);
assert.equal(
  (snapshot.match(
    /create table if not exists public\.waitlist_members/g
  ) ?? []).length,
  1,
  "snapshot must contain one waitlist table definition"
);

const standaloneSql = (await readdir(resolve(root, "supabase")))
  .filter((name) => name.endsWith(".sql") && name !== "schema.sql");
for (const name of standaloneSql) {
  const sql = await readFile(resolve(root, "supabase", name), "utf8");
  assert.match(
    sql,
    /^-- NON-DEPLOYABLE/,
    `${name} must not advertise an alternate deployment path`
  );
}

for (const script of [
  "scripts/apply-atlas-schema.mjs",
  "scripts/apply-living-profiles-migration.mjs",
]) {
  const source = await readFile(resolve(root, script), "utf8");
  assert.match(source, /migrations\/manifest\.json/);
  assert.doesNotMatch(
    source,
    /readFile\([^)]*schemaPath|20260802_living_profiles\.sql/,
    `${script} still emits SQL outside the manifest`
  );
}

console.log(
  `Supabase deployment integrity: PASS (${migrationFiles.length} migrations, ${Object.keys(paths).length} paths)`
);

if (process.argv.includes("--self-test")) {
  const insecure = new Map(migrationSql);
  const secureFile =
    manifest.securityInvariants.greenfieldSecureRoleMigration;
  insecure.set(
    secureFile,
    insecure
      .get(secureFile)
      .replace("raw_app_meta_data->>'role'", "raw_user_meta_data->>'role'")
  );
  assert.throws(
    () => assertEffectiveRoleSecurity(paths, insecure),
    /effective trigger/
  );
  console.log("Supabase deployment integrity negative test: PASS");
}
