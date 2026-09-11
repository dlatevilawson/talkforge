-- IV-PROD-011 / Decision 061 — Forge Agent check-in Phases 0–2
-- Member-opt-in, member-declared cues, in-app approval inbox.
-- No calendar, email, auto-approval, identity writes, or cron in this slice.
-- Lazy materialization happens in application GET handlers (template copy).

-- ---------------------------------------------------------------------------
-- Preferences (opt-in default OFF, in-app only)
-- ---------------------------------------------------------------------------
create table if not exists public.forge_agent_preferences (
  user_id uuid primary key
    references public.profiles (id) on delete cascade,
  outreach_enabled boolean not null default false,
  channel text not null default 'in_app'
    check (channel = 'in_app'),
  quiet_hours jsonb,
  denied_cue_classes text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists forge_agent_preferences_set_updated_at
  on public.forge_agent_preferences;
create trigger forge_agent_preferences_set_updated_at
  before update on public.forge_agent_preferences
  for each row execute function public.set_updated_at();

comment on table public.forge_agent_preferences is
  'Forge Agent outreach opt-in. Default OFF. Channel is in-app only until a later Founder decision.';
comment on column public.forge_agent_preferences.denied_cue_classes is
  'Cue kinds the member denied; materialization must not recreate them (MBL-001 §14.2).';

-- ---------------------------------------------------------------------------
-- Cues (member-declared only in Phases 0–2)
-- ---------------------------------------------------------------------------
create table if not exists public.forge_cues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references public.profiles (id) on delete cascade,
  kind text not null
    check (kind in ('upcoming_conversation', 'practice_follow_up', 'homework')),
  title text not null,
  success_criteria text,
  due_at timestamptz not null,
  source text not null default 'member'
    check (source in ('member', 'session')),
  source_session_id text,
  status text not null default 'active'
    check (status in ('active', 'paused', 'consumed', 'cancelled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists forge_cues_user_due_idx
  on public.forge_cues (user_id, due_at);
create index if not exists forge_cues_user_status_idx
  on public.forge_cues (user_id, status);

drop trigger if exists forge_cues_set_updated_at on public.forge_cues;
create trigger forge_cues_set_updated_at
  before update on public.forge_cues
  for each row execute function public.set_updated_at();

comment on table public.forge_cues is
  'Member-declared Forge Agent cues. source_session_id is text with no FK onto practice_sessions.';
comment on column public.forge_cues.source_session_id is
  'Optional originating practice session id. Not a foreign key (HARDEN-005 / slot lifecycle).';

-- ---------------------------------------------------------------------------
-- Actions (approval-gated in-app check-ins)
-- ---------------------------------------------------------------------------
create table if not exists public.forge_agent_actions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null
    references public.profiles (id) on delete cascade,
  cue_id uuid not null
    references public.forge_cues (id) on delete cascade,
  action_type text not null default 'in_app_checkin'
    check (action_type = 'in_app_checkin'),
  status text not null default 'pending_approval'
    check (
      status in (
        'pending_approval',
        'approved',
        'denied',
        'expired',
        'delivered',
        'failed'
      )
    ),
  payload jsonb not null default '{}'::jsonb,
  approved_at timestamptz,
  denied_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint forge_agent_actions_cue_id_uidx unique (cue_id)
);

create index if not exists forge_agent_actions_user_status_idx
  on public.forge_agent_actions (user_id, status);

drop trigger if exists forge_agent_actions_set_updated_at
  on public.forge_agent_actions;
create trigger forge_agent_actions_set_updated_at
  before update on public.forge_agent_actions
  for each row execute function public.set_updated_at();

comment on table public.forge_agent_actions is
  'In-app check-in drafts. Nothing sends without explicit approve or deny.';
comment on column public.forge_agent_actions.payload is
  'Template copy: whySent, body, practiceHref. No model draft in Phases 0–2.';

-- ---------------------------------------------------------------------------
-- Runs (Phase 3 audit substrate; service_role only)
-- ---------------------------------------------------------------------------
create table if not exists public.forge_agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid
    references public.profiles (id) on delete cascade,
  kind text not null default 'unused',
  status text not null default 'unused',
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.forge_agent_runs is
  'Forge Agent run audit. Unused until Phase 3 cron. No member policies.';

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------
alter table public.forge_agent_preferences enable row level security;
alter table public.forge_cues enable row level security;
alter table public.forge_agent_actions enable row level security;
alter table public.forge_agent_runs enable row level security;

drop policy if exists "forge_agent_preferences_own" on public.forge_agent_preferences;
create policy "forge_agent_preferences_own"
  on public.forge_agent_preferences for all
  to authenticated
  using (user_id = auth.uid() or public.is_founder_or_admin())
  with check (user_id = auth.uid());

drop policy if exists "forge_cues_own" on public.forge_cues;
create policy "forge_cues_own"
  on public.forge_cues for all
  to authenticated
  using (user_id = auth.uid() or public.is_founder_or_admin())
  with check (user_id = auth.uid());

drop policy if exists "forge_agent_actions_own" on public.forge_agent_actions;
create policy "forge_agent_actions_own"
  on public.forge_agent_actions for all
  to authenticated
  using (user_id = auth.uid() or public.is_founder_or_admin())
  with check (user_id = auth.uid());

-- Runs: no anon/authenticated policies. service_role bypasses RLS.
revoke all on table public.forge_agent_runs from anon, authenticated;
grant all on table public.forge_agent_runs to service_role;

-- ---------------------------------------------------------------------------
-- Account reset: purge agent tables first; keep existing RETURNS TABLE shape.
-- ---------------------------------------------------------------------------
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
  delete from public.forge_agent_runs
  where user_id = member_id;
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
