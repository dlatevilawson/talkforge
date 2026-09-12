-- Decision 061 follow-up: member account reset cannot DELETE forge_agent_runs.
-- reset_my_talkforge_data() is SECURITY INVOKER. Runs stay service_role-only
-- (no member policies). Production smoke returned 42501 / 403:
--   permission denied for table forge_agent_runs
-- Purge that table through a uid-scoped SECURITY DEFINER helper in schema
-- private (not PostgREST-exposed). Return type of reset_my_talkforge_data()
-- is unchanged. This file has not been applied to production.

create index if not exists forge_agent_runs_user_id_idx
  on public.forge_agent_runs (user_id);

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;
grant usage on schema private to service_role;

comment on schema private is
  'Internal helpers only. Not an exposed PostgREST schema.';

-- If an earlier draft of this unapplied file created a public helper, drop it.
drop function if exists public.purge_forge_agent_runs_for_member();

create or replace function private.purge_forge_agent_runs_for_member()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $function$
declare
  member_id uuid := auth.uid();
begin
  if member_id is null then
    raise exception 'Authentication is required to reset TalkForge data.'
      using errcode = '28000';
  end if;

  delete from public.forge_agent_runs
  where user_id = member_id;
end
$function$;

revoke all on function private.purge_forge_agent_runs_for_member() from public;
revoke all on function private.purge_forge_agent_runs_for_member() from anon;
grant execute on function private.purge_forge_agent_runs_for_member() to authenticated;
grant execute on function private.purge_forge_agent_runs_for_member() to service_role;

comment on function private.purge_forge_agent_runs_for_member() is
  'Deletes forge_agent_runs owned by auth.uid(). Used only by member account reset; not a member-facing API.';

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
declare
  member_id uuid := auth.uid();
  deleted_living_profiles bigint := 0;
  deleted_coach_memory bigint := 0;
  deleted_practice_sessions bigint := 0;
  deleted_session_reports bigint := 0;
  deleted_reflections bigint := 0;
  deleted_assistant_coach_sessions bigint := 0;
begin
  if member_id is null then
    raise exception 'Authentication is required to reset TalkForge data.'
      using errcode = '28000';
  end if;

  -- Forge Agent rows first so account reset cannot leak check-in data.
  delete from public.forge_agent_actions
  where user_id = member_id;
  delete from public.forge_cues
  where user_id = member_id;
  perform private.purge_forge_agent_runs_for_member();
  delete from public.forge_agent_preferences
  where user_id = member_id;

  -- Delete child rows explicitly so the result reports every resource class.
  -- The function invocation is one database transaction: any failure rolls
  -- back all prior deletes.
  delete from public.reflections
  where user_id = member_id;
  get diagnostics deleted_reflections = row_count;

  delete from public.session_reports
  where user_id = member_id;
  get diagnostics deleted_session_reports = row_count;

  delete from public.practice_sessions
  where user_id = member_id;
  get diagnostics deleted_practice_sessions = row_count;

  delete from public.coach_memory
  where user_id = member_id;
  get diagnostics deleted_coach_memory = row_count;

  -- Claimed / member-linked Assistant Coach sessions (cascades messages + drafts).
  delete from public.assistant_coach_sessions
  where user_id = member_id;
  get diagnostics deleted_assistant_coach_sessions = row_count;

  delete from public.living_profiles
  where user_id = member_id;
  get diagnostics deleted_living_profiles = row_count;

  return query
  select
    deleted_living_profiles,
    deleted_coach_memory,
    deleted_practice_sessions,
    deleted_session_reports,
    deleted_reflections,
    deleted_assistant_coach_sessions;
end
$function$;

comment on function public.reset_my_talkforge_data() is
  'Atomically deletes active TalkForge identity and coaching data owned by auth.uid(), including claimed Assistant Coach sessions (messages/drafts cascade) and Forge Agent check-in rows; retains the Auth account and public.profiles row. Unclaimed anon AC sessions are not member-owned and are excluded.';
