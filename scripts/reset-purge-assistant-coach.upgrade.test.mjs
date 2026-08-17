/**
 * Executes the real Postgres upgrade path:
 *   5-column reset_my_talkforge_data() → (CREATE OR REPLACE fails 42P13)
 *   → DROP+CREATE corrective succeeds with 6-column AC purge.
 *
 * Requires local PostgreSQL reachable as `sudo -u postgres psql`.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const migDir = join(root, "supabase/migrations");
const baselineSql = readFileSync(
  join(migDir, "20260803_atomic_member_data_reset.sql"),
  "utf8"
);
const correctiveSql = readFileSync(
  join(migDir, "20260817_reset_purge_assistant_coach_return_type.sql"),
  "utf8"
);
const failedReplaceSql = `
create or replace function public.reset_my_talkforge_data()
returns table (
  living_profiles_deleted bigint,
  coach_memory_deleted bigint,
  practice_sessions_deleted bigint,
  session_reports_deleted bigint,
  reflections_deleted bigint,
  assistant_coach_sessions_deleted bigint
)
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
begin
  return query select 0::bigint,0::bigint,0::bigint,0::bigint,0::bigint,0::bigint;
end
$function$;
`;

const harnessSetup = `
create schema if not exists auth;
create or replace function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

do $$ begin
  create role anon nologin;
exception when duplicate_object then null;
end $$;
do $$ begin
  create role authenticated nologin;
exception when duplicate_object then null;
end $$;
do $$ begin
  create role service_role nologin;
exception when duplicate_object then null;
end $$;

create table if not exists public.reflections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid
);
create table if not exists public.session_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid
);
create table if not exists public.practice_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid
);
create table if not exists public.coach_memory (
  id uuid primary key default gen_random_uuid(),
  user_id uuid
);
create table if not exists public.living_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid
);
create table if not exists public.assistant_coach_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid
);
create table if not exists public.assistant_coach_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.assistant_coach_sessions(id) on delete cascade
);
create table if not exists public.assistant_coach_profile_drafts (
  session_id uuid primary key references public.assistant_coach_sessions(id) on delete cascade
);
`;

function runPsql(sql, { database = "postgres", expectFail = false, tuples = false } = {}) {
  const args = ["-u", "postgres", "psql", "-d", database, "-v", "ON_ERROR_STOP=1", "-X", "-q"];
  if (tuples) args.push("-t", "-A", "-F", "|");
  const result = spawnSync("sudo", args, { encoding: "utf8", input: sql });
  if (expectFail) {
    assert.notEqual(result.status, 0, "expected SQL to fail");
    return result;
  }
  if (result.status !== 0) {
    throw new Error(
      `psql failed (${result.status}):\n${result.stdout}\n${result.stderr}`
    );
  }
  return result;
}

function tuples(database, sql) {
  return runPsql(sql, { database, tuples: true })
    .stdout.split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

describe("executed Postgres upgrade: 5-column → corrective", () => {
  it("applies baseline, reproduces 42P13, then corrective upgrades return shape", () => {
    const db = `tf_reset_upgrade_${process.pid}_${Date.now()}`;
    runPsql(`create database ${db};`);
    try {
      runPsql(harnessSetup, { database: db });
      runPsql(baselineSql, { database: db });

      const before = tuples(
        db,
        `select pg_get_function_result(p.oid),
                (position('assistant_coach_sessions' in pg_get_functiondef(p.oid)) > 0)::text
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'reset_my_talkforge_data';`
      );
      assert.equal(before.length, 1);
      const [beforeResult, beforeHasAc] = before[0].split("|");
      assert.match(
        beforeResult,
        /TABLE\(living_profiles_deleted bigint, coach_memory_deleted bigint, practice_sessions_deleted bigint, session_reports_deleted bigint, reflections_deleted bigint\)/
      );
      assert.doesNotMatch(beforeResult, /assistant_coach_sessions_deleted/);
      assert.equal(beforeHasAc, "false");

      const failed = runPsql(failedReplaceSql, { database: db, expectFail: true });
      assert.match(`${failed.stderr}\n${failed.stdout}`, /42P13|cannot change return type/i);

      runPsql(correctiveSql, { database: db });

      const after = tuples(
        db,
        `select pg_get_function_result(p.oid),
                (position('assistant_coach_sessions' in pg_get_functiondef(p.oid)) > 0)::text,
                (not p.prosecdef)::text,
                coalesce(array_to_string(p.proconfig, ','), ''),
                has_function_privilege('anon', p.oid, 'EXECUTE')::text,
                has_function_privilege('authenticated', p.oid, 'EXECUTE')::text,
                has_function_privilege('service_role', p.oid, 'EXECUTE')::text
         from pg_proc p
         join pg_namespace n on n.oid = p.pronamespace
         where n.nspname = 'public' and p.proname = 'reset_my_talkforge_data';`
      );
      assert.equal(after.length, 1);
      const [afterResult, afterHasAc, invoker, config, anonExec, authExec, serviceExec] =
        after[0].split("|");
      assert.match(afterResult, /assistant_coach_sessions_deleted bigint/);
      assert.equal(afterHasAc, "true");
      assert.equal(invoker, "true");
      assert.match(config, /search_path/);
      assert.equal(anonExec, "false");
      assert.equal(authExec, "true");
      assert.equal(serviceExec, "true");

      const memberId = tuples(db, `select gen_random_uuid();`)[0];
      runPsql(
        `insert into public.assistant_coach_sessions (id, user_id) values
           ('11111111-1111-1111-1111-111111111111', '${memberId}'),
           ('22222222-2222-2222-2222-222222222222', null);
         insert into public.assistant_coach_messages (session_id) values
           ('11111111-1111-1111-1111-111111111111'),
           ('22222222-2222-2222-2222-222222222222');
         insert into public.assistant_coach_profile_drafts (session_id) values
           ('11111111-1111-1111-1111-111111111111'),
           ('22222222-2222-2222-2222-222222222222');`,
        { database: db }
      );

      const deleted = tuples(
        db,
        `begin;
         select set_config('request.jwt.claim.sub', '${memberId}', true);
         select assistant_coach_sessions_deleted::text from public.reset_my_talkforge_data();
         commit;`
      );
      assert.equal(deleted.at(-1), "1");

      const remaining = tuples(
        db,
        `select count(*)::text from public.assistant_coach_sessions where user_id is null;`
      );
      assert.equal(remaining[0], "1");

      const orphanChildren = tuples(
        db,
        `select
           (select count(*) from public.assistant_coach_messages
              where session_id = '11111111-1111-1111-1111-111111111111')::text
           || '|' ||
           (select count(*) from public.assistant_coach_profile_drafts
              where session_id = '11111111-1111-1111-1111-111111111111')::text
           || '|' ||
           (select count(*) from public.assistant_coach_messages
              where session_id = '22222222-2222-2222-2222-222222222222')::text;`
      );
      assert.equal(orphanChildren[0], "0|0|1");
    } finally {
      runPsql(`drop database if exists ${db} with (force);`);
    }
  });
});
