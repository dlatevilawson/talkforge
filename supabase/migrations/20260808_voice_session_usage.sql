-- Invisible voice economics observability (Pro Hands-Free cost protection).
-- Never surface token meters to members. Server is write authority.

create table if not exists public.voice_session_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  practice_session_id text references public.practice_sessions (id) on delete set null,
  realtime_session_id text,
  plan text not null default 'free'
    check (plan in ('free', 'pro')),
  voice_mode text not null default 'hold'
    check (voice_mode in ('hold', 'handsfree')),
  model text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  duration_seconds integer,
  assistant_turns integer not null default 0,
  user_speech_events integer not null default 0,
  barge_in_count integer not null default 0,
  estimated_input_tokens integer not null default 0,
  estimated_output_tokens integer not null default 0,
  concise_mode_engaged boolean not null default false,
  estimated_cost_usd numeric(10, 4),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists voice_session_usage_user_started_idx
  on public.voice_session_usage (user_id, started_at desc);

create index if not exists voice_session_usage_practice_idx
  on public.voice_session_usage (practice_session_id);

alter table public.voice_session_usage enable row level security;

drop policy if exists "voice_session_usage_select_own" on public.voice_session_usage;
create policy "voice_session_usage_select_own"
  on public.voice_session_usage for select
  to authenticated
  using (user_id = auth.uid() or public.is_founder_or_admin());

-- Inserts/updates via service role / server routes only.

drop trigger if exists voice_session_usage_set_updated_at on public.voice_session_usage;
create trigger voice_session_usage_set_updated_at
  before update on public.voice_session_usage
  for each row execute function public.set_updated_at();

comment on table public.voice_session_usage is
  'Server-authoritative voice AI usage for cost observability. Never shown as a member meter.';
