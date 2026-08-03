-- HARDEN-003 Milestone 5.1 — atomic member-owned data reset.
--
-- This operation deletes active TalkForge identity and coaching data for the
-- authenticated caller. It deliberately retains auth.users and public.profiles.

create or replace function public.reset_my_talkforge_data()
returns table (
  living_profiles_deleted bigint,
  coach_memory_deleted bigint,
  practice_sessions_deleted bigint,
  session_reports_deleted bigint,
  reflections_deleted bigint
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
begin
  if member_id is null then
    raise exception 'Authentication is required to reset TalkForge data.'
      using errcode = '28000';
  end if;

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

  delete from public.living_profiles
  where user_id = member_id;
  get diagnostics deleted_living_profiles = row_count;

  return query
  select
    deleted_living_profiles,
    deleted_coach_memory,
    deleted_practice_sessions,
    deleted_session_reports,
    deleted_reflections;
end
$function$;

revoke all on function public.reset_my_talkforge_data() from public;
revoke all on function public.reset_my_talkforge_data() from anon;
grant execute on function public.reset_my_talkforge_data() to authenticated;

comment on function public.reset_my_talkforge_data() is
  'Atomically deletes active TalkForge identity and coaching data owned by auth.uid(); retains the Auth account and public.profiles row.';
