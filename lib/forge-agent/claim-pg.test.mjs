/**
 * Live PostgreSQL tests for claim_due_forge_cues.
 * Enabled when psql can connect via FORGE_AGENT_CLAIM_TEST_DATABASE_URL,
 * DATABASE_URL, or the default local socket.
 */
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import { describe, it } from "node:test";

function resolveUrl() {
  return (
    process.env.FORGE_AGENT_CLAIM_TEST_DATABASE_URL ||
    process.env.DATABASE_URL ||
    ""
  );
}

function psqlArgs(url, sql) {
  return url
    ? [url, "-v", "ON_ERROR_STOP=1", "-At", "-c", sql]
    : ["-v", "ON_ERROR_STOP=1", "-At", "-c", sql];
}

function psql(url, sql) {
  const result = spawnSync("psql", psqlArgs(url, sql), {
    encoding: "utf8",
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "psql failed");
  }
  return result.stdout.trim();
}

function postgresAvailable() {
  const version = spawnSync("psql", ["--version"], { encoding: "utf8" });
  if (version.status !== 0) return false;
  try {
    psql(resolveUrl(), "select 1");
    return true;
  } catch {
    return false;
  }
}

const enabled = postgresAvailable();

const FUNCTION_SQL = `
create or replace function forge_agent_phase3_test.claim_due_forge_cues(p_limit integer)
returns table (
  action_id uuid,
  cue_id uuid,
  user_id uuid,
  generation_allowed boolean
)
language plpgsql
volatile
security invoker
set search_path = ''
as $function$
#variable_conflict use_column
declare
  remaining integer;
  claimed record;
  new_action_id uuid;
  reserved_attempt_id uuid;
  run_day_utc date := (timezone('utc', now()))::date;
begin
  remaining := least(greatest(coalesce(p_limit, 0), 0), 12);
  if remaining = 0 then
    return;
  end if;
  for claimed in
    select c.id as cue_id, c.user_id as user_id
    from forge_agent_phase3_test.forge_cues as c
    inner join forge_agent_phase3_test.forge_agent_preferences as prefs
      on prefs.user_id = c.user_id
    where prefs.outreach_enabled = true
      and c.status = 'active'
      and c.due_at <= now()
      and not (c.kind = any (prefs.denied_cue_classes))
      and not exists (
        select 1 from forge_agent_phase3_test.forge_agent_actions as existing
        where existing.cue_id = c.id
      )
    order by c.due_at asc, c.created_at asc
    limit remaining
    for update of c skip locked
  loop
    insert into forge_agent_phase3_test.forge_agent_actions (
      user_id, cue_id, action_type, status, payload
    ) values (
      claimed.user_id, claimed.cue_id, 'in_app_checkin', 'drafting', '{}'::jsonb
    )
    returning id into new_action_id;

    reserved_attempt_id := null;
    insert into forge_agent_phase3_test.forge_agent_runs (
      user_id, kind, status, run_day, detail
    ) values (
      claimed.user_id, 'draft_attempt', 'started', run_day_utc,
      jsonb_build_object('cue_id', claimed.cue_id, 'action_id', new_action_id)
    )
    on conflict (user_id, run_day) where kind = 'draft_attempt'
    do nothing
    returning id into reserved_attempt_id;

    action_id := new_action_id;
    cue_id := claimed.cue_id;
    user_id := claimed.user_id;
    generation_allowed := reserved_attempt_id is not null;
    return next;
  end loop;
end
$function$;
revoke all on function forge_agent_phase3_test.claim_due_forge_cues(integer) from public;
revoke all on function forge_agent_phase3_test.claim_due_forge_cues(integer) from anon;
revoke all on function forge_agent_phase3_test.claim_due_forge_cues(integer) from authenticated;
grant execute on function forge_agent_phase3_test.claim_due_forge_cues(integer) to service_role;
`;

describe("claim_due_forge_cues postgres", { skip: !enabled }, () => {
  const url = resolveUrl();

  it("denies anon and authenticated and allows one paid generation under concurrency", async () => {
    psql(
      url,
      `
      drop schema if exists forge_agent_phase3_test cascade;
      create schema forge_agent_phase3_test;
      do $$ begin
        if not exists (select 1 from pg_roles where rolname = 'anon') then
          create role anon nologin;
        end if;
        if not exists (select 1 from pg_roles where rolname = 'authenticated') then
          create role authenticated nologin;
        end if;
        if not exists (select 1 from pg_roles where rolname = 'service_role') then
          create role service_role nologin bypassrls;
        end if;
      end $$;
      create table forge_agent_phase3_test.forge_agent_preferences (
        user_id uuid primary key,
        outreach_enabled boolean not null default false,
        denied_cue_classes text[] not null default '{}'
      );
      create table forge_agent_phase3_test.forge_cues (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null,
        kind text not null,
        title text not null default 'cue',
        success_criteria text,
        due_at timestamptz not null,
        status text not null default 'active',
        created_at timestamptz not null default now()
      );
      create table forge_agent_phase3_test.forge_agent_actions (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null,
        cue_id uuid not null unique,
        action_type text not null default 'in_app_checkin',
        status text not null default 'drafting',
        payload jsonb not null default '{}'::jsonb
      );
      create table forge_agent_phase3_test.forge_agent_runs (
        id uuid primary key default gen_random_uuid(),
        user_id uuid,
        kind text not null,
        status text not null,
        run_day date,
        detail jsonb not null default '{}'::jsonb
      );
      create unique index forge_agent_runs_draft_attempt_user_day_uidx
        on forge_agent_phase3_test.forge_agent_runs (user_id, run_day)
        where kind = 'draft_attempt';
      `
    );
    psql(url, FUNCTION_SQL);

    const member = "11111111-1111-1111-1111-111111111111";
    psql(
      url,
      `
      insert into forge_agent_phase3_test.forge_agent_preferences (user_id, outreach_enabled)
      values ('${member}', true);
      insert into forge_agent_phase3_test.forge_cues (user_id, kind, due_at)
      values
        ('${member}', 'homework', now() - interval '1 hour'),
        ('${member}', 'upcoming_conversation', now() - interval '30 minutes');
      grant usage on schema forge_agent_phase3_test to anon, authenticated, service_role;
      grant all on all tables in schema forge_agent_phase3_test to service_role;
      grant usage, create on schema forge_agent_phase3_test to service_role;
      grant execute on function forge_agent_phase3_test.claim_due_forge_cues(integer) to service_role;
      revoke all on function forge_agent_phase3_test.claim_due_forge_cues(integer) from public, anon, authenticated;
      grant anon, authenticated, service_role to current_user;
      `
    );

    const anonDenied = spawnSync(
      "psql",
      psqlArgs(
        url,
        "set role anon; select * from forge_agent_phase3_test.claim_due_forge_cues(12);"
      ),
      { encoding: "utf8", env: process.env }
    );
    assert.notEqual(anonDenied.status, 0);
    assert.match(`${anonDenied.stderr}${anonDenied.stdout}`, /permission denied/i);

    const authDenied = spawnSync(
      "psql",
      psqlArgs(
        url,
        "set role authenticated; select * from forge_agent_phase3_test.claim_due_forge_cues(12);"
      ),
      { encoding: "utf8", env: process.env }
    );
    assert.notEqual(authDenied.status, 0);
    assert.match(`${authDenied.stderr}${authDenied.stdout}`, /permission denied/i);

    const allowed = psql(
      url,
      `
      set role service_role;
      select count(*) filter (where generation_allowed)
      from forge_agent_phase3_test.claim_due_forge_cues(12);
      `
    )
      .split("\n")
      .at(-1);
    assert.equal(allowed, "1");

    const second = psql(
      url,
      `
      set role service_role;
      select count(*) from forge_agent_phase3_test.claim_due_forge_cues(12);
      `
    )
      .split("\n")
      .at(-1);
    assert.equal(second, "0");

    const other = "22222222-2222-2222-2222-222222222222";
    psql(
      url,
      `
      insert into forge_agent_phase3_test.forge_agent_preferences (user_id, outreach_enabled)
      values ('${other}', true);
      insert into forge_agent_phase3_test.forge_cues (user_id, kind, due_at)
      values
        ('${other}', 'homework', now() - interval '10 minutes'),
        ('${other}', 'practice_follow_up', now() - interval '5 minutes');
      `
    );
    const claimSql =
      "set role service_role; select count(*) filter (where generation_allowed) from forge_agent_phase3_test.claim_due_forge_cues(12);";
    const runClaim = () =>
      new Promise((resolve, reject) => {
        const child = spawn("psql", psqlArgs(url, claimSql), {
          env: process.env,
        });
        let stdout = "";
        let stderr = "";
        child.stdout.on("data", (chunk) => {
          stdout += chunk;
        });
        child.stderr.on("data", (chunk) => {
          stderr += chunk;
        });
        child.on("close", (code) => {
          if (code !== 0) reject(new Error(stderr || stdout));
          else resolve(stdout.trim().split("\n").at(-1));
        });
      });
    const [left, right] = await Promise.all([runClaim(), runClaim()]);
    assert.equal(Number(left) + Number(right), 1);
  });
});
