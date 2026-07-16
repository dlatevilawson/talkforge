-- TalkForge MVP persistence schema
-- Run in the Supabase SQL editor, then enable anon insert/select for guest MVP.

create table if not exists public.profiles (
  id text primary key,
  display_name text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.practice_sessions (
  id text primary key,
  user_id text not null references public.profiles (id) on delete cascade,
  scenario_id text not null,
  scenario_title text not null,
  mission_prompt text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  average_score integer,
  turns jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.reflections (
  session_id text primary key references public.practice_sessions (id) on delete cascade,
  user_id text not null references public.profiles (id) on delete cascade,
  went_well text not null,
  improve_next text not null,
  coach_satisfaction integer,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.reflections enable row level security;

-- Guest MVP policies (tighten once real auth is enabled).
drop policy if exists "profiles_anon_all" on public.profiles;
create policy "profiles_anon_all"
  on public.profiles for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "sessions_anon_all" on public.practice_sessions;
create policy "sessions_anon_all"
  on public.practice_sessions for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "reflections_anon_all" on public.reflections;
create policy "reflections_anon_all"
  on public.reflections for all
  to anon, authenticated
  using (true)
  with check (true);
