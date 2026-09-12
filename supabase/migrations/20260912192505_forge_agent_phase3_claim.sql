-- Decision 062 / IV-PROD-011 Phase 3 Stage A
-- Atomic due-cue claim + paid draft_attempt reservation.
-- SECURITY INVOKER; executable only by service_role.
-- Cursor must not apply this file. Codex applies it and reconciles the version.

-- Invisible drafting status. Inbox lists pending_approval only.
alter table public.forge_agent_actions
  drop constraint if exists forge_agent_actions_status_check;

alter table public.forge_agent_actions
  add constraint forge_agent_actions_status_check
  check (
    status in (
      'pending_approval',
      'approved',
      'denied',
      'expired',
      'delivered',
      'failed',
      'drafting'
    )
  );

alter table public.forge_agent_runs
  add column if not exists run_day date;

alter table public.forge_agent_runs
  drop constraint if exists forge_agent_runs_draft_attempt_identity;

alter table public.forge_agent_runs
  add constraint forge_agent_runs_draft_attempt_identity
  check (
    kind <> 'draft_attempt'
    or (user_id is not null and run_day is not null)
  );

drop index if exists public.forge_agent_runs_draft_attempt_user_day_uidx;
create unique index forge_agent_runs_draft_attempt_user_day_uidx
  on public.forge_agent_runs (user_id, run_day)
  where kind = 'draft_attempt';

comment on column public.forge_agent_runs.run_day is
  'UTC calendar day for draft_attempt reservation. Null on cron_tick and other kinds.';

comment on index public.forge_agent_runs_draft_attempt_user_day_uidx is
  'One paid draft_attempt per member per UTC day. Reserved by claim_due_forge_cues.';

create or replace function public.claim_due_forge_cues(
  p_limit integer,
  p_cron_run_id uuid default null
)
returns table (
  action_id uuid,
  cue_id uuid,
  user_id uuid,
  generation_allowed boolean,
  attempt_id uuid
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
    select
      c.id as cue_id,
      c.user_id as user_id
    from public.forge_cues as c
    inner join public.forge_agent_preferences as prefs
      on prefs.user_id = c.user_id
    where prefs.outreach_enabled = true
      and c.status = 'active'
      and c.due_at <= now()
      and not (c.kind = any (prefs.denied_cue_classes))
      and not exists (
        select 1
        from public.forge_agent_actions as existing
        where existing.cue_id = c.id
      )
    order by c.due_at asc, c.created_at asc
    limit remaining
    for update of c skip locked
  loop
    new_action_id := null;
    insert into public.forge_agent_actions (
      user_id,
      cue_id,
      action_type,
      status,
      payload
    )
    values (
      claimed.user_id,
      claimed.cue_id,
      'in_app_checkin',
      'drafting',
      '{}'::jsonb
    )
    on conflict (cue_id) do nothing
    returning id into new_action_id;

    if new_action_id is null then
      continue;
    end if;

    reserved_attempt_id := null;
    insert into public.forge_agent_runs (
      user_id,
      kind,
      status,
      run_day,
      detail
    )
    values (
      claimed.user_id,
      'draft_attempt',
      'started',
      run_day_utc,
      jsonb_strip_nulls(
        jsonb_build_object(
          'cue_id', claimed.cue_id,
          'action_id', new_action_id,
          'cron_run_id', p_cron_run_id
        )
      )
    )
    on conflict (user_id, run_day) where kind = 'draft_attempt'
    do nothing
    returning id into reserved_attempt_id;

    action_id := new_action_id;
    cue_id := claimed.cue_id;
    user_id := claimed.user_id;
    generation_allowed := reserved_attempt_id is not null;
    attempt_id := reserved_attempt_id;
    return next;
  end loop;
end
$function$;

revoke all on function public.claim_due_forge_cues(integer, uuid) from public;
revoke all on function public.claim_due_forge_cues(integer, uuid) from anon;
revoke all on function public.claim_due_forge_cues(integer, uuid) from authenticated;
grant execute on function public.claim_due_forge_cues(integer, uuid) to service_role;

comment on function public.claim_due_forge_cues(integer, uuid) is
  'Decision 062 Stage A. Service-role-only invoker RPC. Claims due cues into drafting with ON CONFLICT (cue_id) DO NOTHING so a lazy inbox insert cannot abort the batch. Reserves one paid draft_attempt per member per UTC day and returns that attempt_id. generation_allowed is true only when the attempt insert wins.';
