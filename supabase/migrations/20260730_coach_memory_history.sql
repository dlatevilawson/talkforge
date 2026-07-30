-- Coach memory + permanent session reports (AUTH-001)
-- Run in Supabase SQL editor after AUTH-001 / legacy upgrade migrations.
-- Every completed practice session should leave a durable report;
-- Coach Forge reads coach_memory for continuity across sessions.

-- ---------------------------------------------------------------------------
-- practice_sessions: modality for voice vs text
-- ---------------------------------------------------------------------------

alter table public.practice_sessions
  add column if not exists modality text not null default 'text'
    check (modality in ('voice', 'text'));

alter table public.practice_sessions
  add column if not exists duration_seconds integer;

create index if not exists practice_sessions_user_completed_idx
  on public.practice_sessions (user_id, completed_at desc nulls last);

-- ---------------------------------------------------------------------------
-- Session reports — permanent coaching history per session
-- ---------------------------------------------------------------------------

create table if not exists public.session_reports (
  session_id text primary key
    references public.practice_sessions (id) on delete cascade,
  user_id uuid not null
    references public.profiles (id) on delete cascade,
  session_number integer not null default 1,
  modality text not null default 'voice'
    check (modality in ('voice', 'text')),
  duration_seconds integer,
  overall_score integer,
  confidence integer,
  empathy integer,
  listening integer,
  clarity integer,
  storytelling integer,
  negotiation integer,
  leadership integer,
  questions_asked integer not null default 0,
  interruptions integer not null default 0,
  filler_words integer not null default 0,
  breakthrough text not null default '',
  biggest_weakness text not null default '',
  homework text not null default '',
  coach_summary text not null default '',
  transcript jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists session_reports_user_created_idx
  on public.session_reports (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Relationship memory — selective facts that improve the next session
-- ---------------------------------------------------------------------------

create table if not exists public.coach_memory (
  user_id uuid primary key
    references public.profiles (id) on delete cascade,
  display_name text not null default '',
  occupation text not null default '',
  communication_goals text[] not null default '{}',
  biggest_fears text[] not null default '{}',
  recent_wins text[] not null default '{}',
  topics_working_on text[] not null default '{}',
  preferred_coaching_style text not null default '',
  confidence_level integer,
  speaking_habits text[] not null default '{}',
  favorite_scenarios text[] not null default '{}',
  past_exercises text[] not null default '{}',
  notes jsonb not null default '{}'::jsonb,
  last_session_id text,
  last_session_summary text not null default '',
  last_scenario_title text not null default '',
  sessions_completed integer not null default 0,
  updated_at timestamptz not null default now()
);

drop trigger if exists coach_memory_set_updated_at on public.coach_memory;
create trigger coach_memory_set_updated_at
  before update on public.coach_memory
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.session_reports enable row level security;
alter table public.coach_memory enable row level security;

drop policy if exists "session_reports_own" on public.session_reports;
create policy "session_reports_own"
  on public.session_reports for all
  to authenticated
  using (user_id = auth.uid() or public.is_founder_or_admin())
  with check (user_id = auth.uid());

drop policy if exists "coach_memory_own" on public.coach_memory;
create policy "coach_memory_own"
  on public.coach_memory for all
  to authenticated
  using (user_id = auth.uid() or public.is_founder_or_admin())
  with check (user_id = auth.uid());
