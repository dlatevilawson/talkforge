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

-- Guest + GitHub Auth policies.
-- profiles.id is either a guest uuid (sessionStorage pointer) or auth.users.id (GitHub).
-- Tighten to auth.uid()::text = id once guest mode is retired.
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

-- Atlas Founder OS (Phase 3)
create table if not exists public.founder_notes (
  id text primary key,
  body text not null,
  category text not null check (
    category in ('Product', 'Marketing', 'Engineering', 'Company', 'Future Ideas')
  ),
  created_at timestamptz not null default now()
);

create table if not exists public.founder_briefs (
  id text primary key,
  summary text not null,
  priorities jsonb not null default '[]'::jsonb,
  generated_at timestamptz not null default now(),
  source text not null default 'deterministic'
);

alter table public.founder_notes enable row level security;
alter table public.founder_briefs enable row level security;

drop policy if exists "founder_notes_anon_all" on public.founder_notes;
create policy "founder_notes_anon_all"
  on public.founder_notes for all
  to anon, authenticated
  using (true)
  with check (true);

drop policy if exists "founder_briefs_anon_all" on public.founder_briefs;
create policy "founder_briefs_anon_all"
  on public.founder_briefs for all
  to anon, authenticated
  using (true)
  with check (true);
