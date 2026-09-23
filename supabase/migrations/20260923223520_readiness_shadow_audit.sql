-- Decision 064 / READINESS-SHADOW-001.
-- Private audit envelope for every allowlisted shadow evaluator model call.
-- This migration does not enable the evaluator or expose member-facing data.

-- Decision 064 keeps every readiness result server-only during shadow review.
-- A future, separately approved display migration must deliberately restore
-- authenticated SELECT grants and member policies.
drop policy if exists "session_readiness_assessments_read_own"
  on public.session_readiness_assessments;
drop policy if exists "session_readiness_signals_read_own"
  on public.session_readiness_signals;
drop policy if exists "session_readiness_evidence_read_own"
  on public.session_readiness_evidence;

revoke all on table public.session_readiness_assessments
  from public, anon, authenticated;
revoke all on table public.session_readiness_signals
  from public, anon, authenticated;
revoke all on table public.session_readiness_evidence
  from public, anon, authenticated;

create table if not exists public.session_readiness_shadow_runs (
  id uuid primary key,
  session_id text not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  rubric_version text not null,
  assessment_revision smallint not null default 1
    check (assessment_revision > 0),
  model text not null check (char_length(model) between 1 and 120),
  status text not null
    check (status in ('pending', 'completed', 'failed')),
  input_tokens integer check (input_tokens is null or input_tokens >= 0),
  output_tokens integer check (output_tokens is null or output_tokens >= 0),
  error_code text
    check (error_code is null or char_length(error_code) between 1 and 80),
  assessment_id uuid unique
    references public.session_readiness_assessments (id) on delete set null,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint session_readiness_shadow_runs_session_owner_fk
    foreign key (session_id, user_id)
    references public.practice_sessions (id, user_id)
    on delete cascade,
  constraint session_readiness_shadow_runs_identity_uidx
    unique (session_id, rubric_version, assessment_revision),
  constraint session_readiness_shadow_runs_state_check
    check (
      (status = 'pending' and completed_at is null and error_code is null)
      or (
        status = 'completed'
        and completed_at is not null
        and error_code is null
        and assessment_id is not null
      )
      or (
        status = 'failed'
        and completed_at is not null
        and error_code is not null
        and assessment_id is null
      )
    )
);

create index if not exists session_readiness_shadow_runs_user_created_idx
  on public.session_readiness_shadow_runs (user_id, created_at desc);

create index if not exists session_readiness_shadow_runs_pending_idx
  on public.session_readiness_shadow_runs (created_at)
  where status = 'pending';

alter table public.session_readiness_shadow_runs enable row level security;

revoke all on table public.session_readiness_shadow_runs
  from public, anon, authenticated;
grant all on table public.session_readiness_shadow_runs to service_role;

comment on table public.session_readiness_shadow_runs is
  'Server-only Decision 064 audit envelope. Created before each shadow model call; stores outcome and provider token usage without prompts or raw output.';
