-- Decision 063 / READINESS-MEASUREMENT-001 foundation.
-- Versioned, evidence-linked readiness assessments for completed member sessions.
-- This migration does not generate assessments or expose a member UI.

create unique index if not exists practice_sessions_id_user_uidx
  on public.practice_sessions (id, user_id);

create table if not exists public.session_readiness_assessments (
  id uuid primary key default gen_random_uuid(),
  session_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rubric_version text not null,
  assessment_revision smallint not null default 1
    check (assessment_revision > 0),
  scenario_family text not null,
  session_purpose text not null
    check (
      session_purpose in (
        'diagnostic',
        'check_in',
        'emergency',
        'free_practice',
        'drill',
        'text_exercise',
        'priming',
        'field_log_back'
      )
    ),
  modality text not null check (modality in ('voice', 'text')),
  pressure_level text not null
    check (pressure_level in ('low', 'moderate', 'high')),
  overall_band text
    check (
      overall_band is null
      or overall_band in (
        'building_baseline',
        'one_focus_area',
        'early_reps',
        'solid_ground',
        'sustained_in_practice'
      )
    ),
  primary_focus_signal text
    check (
      primary_focus_signal is null
      or primary_focus_signal in (
        'purpose',
        'perspective',
        'composure',
        'message',
        'adaptability'
      )
    ),
  created_at timestamptz not null default now(),
  constraint session_readiness_assessments_session_owner_fk
    foreign key (session_id, user_id)
    references public.practice_sessions (id, user_id)
    on delete cascade,
  constraint session_readiness_assessments_revision_uidx
    unique (session_id, rubric_version, assessment_revision),
  constraint session_readiness_assessments_id_user_uidx
    unique (id, user_id)
);

create table if not exists public.session_readiness_signals (
  assessment_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  signal text not null
    check (
      signal in (
        'purpose',
        'perspective',
        'composure',
        'message',
        'adaptability'
      )
    ),
  level smallint check (level between 0 and 4),
  null_reason text
    check (
      null_reason is null
      or null_reason in (
        'insufficient_member_turns',
        'no_defined_counterpart',
        'no_friction_event',
        'no_scenario_shift',
        'capture_quality_insufficient',
        'signal_not_applicable'
      )
    ),
  evidence_strength text not null
    check (evidence_strength in ('sufficient', 'limited', 'insufficient')),
  summary text not null default '',
  created_at timestamptz not null default now(),
  primary key (assessment_id, signal),
  constraint session_readiness_signals_assessment_owner_fk
    foreign key (assessment_id, user_id)
    references public.session_readiness_assessments (id, user_id)
    on delete cascade,
  constraint session_readiness_signals_observation_check
    check (
      (
        level is not null
        and null_reason is null
        and evidence_strength in ('sufficient', 'limited')
      )
      or (
        level is null
        and null_reason is not null
        and evidence_strength = 'insufficient'
      )
    )
);

create table if not exists public.session_readiness_evidence (
  id uuid primary key default gen_random_uuid(),
  assessment_id uuid not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  signal text not null,
  evidence_type text not null
    check (
      evidence_type in ('support', 'friction', 'recovery', 'breakdown')
    ),
  turn_id text,
  occurred_at_ms integer check (occurred_at_ms is null or occurred_at_ms >= 0),
  snippet text not null check (char_length(snippet) between 1 and 1000),
  created_at timestamptz not null default now(),
  constraint session_readiness_evidence_signal_owner_fk
    foreign key (assessment_id, signal)
    references public.session_readiness_signals (assessment_id, signal)
    on delete cascade,
  constraint session_readiness_evidence_assessment_owner_fk
    foreign key (assessment_id, user_id)
    references public.session_readiness_assessments (id, user_id)
    on delete cascade
);

create index if not exists session_readiness_assessments_user_created_idx
  on public.session_readiness_assessments (user_id, created_at desc);

create index if not exists session_readiness_assessments_comparison_idx
  on public.session_readiness_assessments (
    user_id,
    scenario_family,
    session_purpose,
    modality,
    pressure_level,
    created_at desc
  );

create index if not exists session_readiness_signals_user_signal_idx
  on public.session_readiness_signals (user_id, signal, created_at desc);

create index if not exists session_readiness_evidence_assessment_signal_idx
  on public.session_readiness_evidence (assessment_id, signal);

create index if not exists session_readiness_evidence_user_created_idx
  on public.session_readiness_evidence (user_id, created_at desc);

alter table public.session_readiness_assessments enable row level security;
alter table public.session_readiness_signals enable row level security;
alter table public.session_readiness_evidence enable row level security;

revoke all on table public.session_readiness_assessments from public, anon, authenticated;
revoke all on table public.session_readiness_signals from public, anon, authenticated;
revoke all on table public.session_readiness_evidence from public, anon, authenticated;

grant select on table public.session_readiness_assessments to authenticated;
grant select on table public.session_readiness_signals to authenticated;
grant select on table public.session_readiness_evidence to authenticated;

grant all on table public.session_readiness_assessments to service_role;
grant all on table public.session_readiness_signals to service_role;
grant all on table public.session_readiness_evidence to service_role;

create policy "session_readiness_assessments_read_own"
  on public.session_readiness_assessments for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_founder_or_admin())
  );

create policy "session_readiness_signals_read_own"
  on public.session_readiness_signals for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_founder_or_admin())
  );

create policy "session_readiness_evidence_read_own"
  on public.session_readiness_evidence for select
  to authenticated
  using (
    user_id = (select auth.uid())
    or (select public.is_founder_or_admin())
  );

comment on table public.session_readiness_assessments is
  'Versioned session-level readiness assessment context and derived qualitative band. No 0-100 score.';

comment on table public.session_readiness_signals is
  'Five readiness-signal observations. Null means not assessed; it never means zero.';

comment on table public.session_readiness_evidence is
  'Member-private session evidence supporting a readiness signal observation.';
