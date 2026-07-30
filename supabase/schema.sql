-- TalkForge Authentication Foundation
-- Run in the Supabase SQL editor after enabling Email auth.
-- Replaces guest-open RLS with authenticated, identity-scoped policies.
-- Passwords and secrets stay in auth.users — never in public tables.

-- ---------------------------------------------------------------------------
-- Profiles (identity + authorization metadata only)
-- ---------------------------------------------------------------------------

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  first_name text not null default '',
  last_name text not null default '',
  display_name text not null default '',
  email text not null,
  email_verified boolean not null default false,
  created_at timestamptz not null default now(),
  last_login_at timestamptz,
  account_status text not null default 'pending'
    check (account_status in ('pending', 'active', 'suspended', 'deleted')),
  role text not null default 'user'
    check (role in ('guest', 'user', 'premium', 'founder', 'admin', 'system')),
  time_zone text not null default 'UTC',
  preferred_language text not null default 'en',
  onboarding_complete boolean not null default false,
  must_change_password boolean not null default false,
  updated_at timestamptz not null default now()
);

-- If an older guest schema exists (id text), migrate carefully before running.
-- Prefer a clean project for production auth. See AUTH-001 docs.

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_account_status_idx on public.profiles (account_status);

-- ---------------------------------------------------------------------------
-- Practice / reflection tables (uuid user_id when creating fresh)
-- ---------------------------------------------------------------------------

create table if not exists public.practice_sessions (
  id text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  scenario_id text not null,
  scenario_title text not null,
  mission_prompt text not null,
  started_at timestamptz not null,
  completed_at timestamptz,
  average_score integer,
  turns jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  modality text not null default 'text'
    check (modality in ('voice', 'text')),
  duration_seconds integer
);

create index if not exists practice_sessions_user_completed_idx
  on public.practice_sessions (user_id, completed_at desc nulls last);

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

create table if not exists public.coach_memory (
  user_id uuid primary key
    references public.profiles (id) on delete cascade,
  display_name text not null default '',
  preferred_nickname text not null default '',
  occupation text not null default '',
  communication_goals text[] not null default '{}',
  long_term_challenges text[] not null default '{}',
  biggest_fears text[] not null default '{}',
  recent_wins text[] not null default '{}',
  topics_working_on text[] not null default '{}',
  preferred_coaching_style text not null default '',
  learning_style text not null default '',
  confidence_level integer,
  biggest_strength text not null default '',
  speaking_habits text[] not null default '{}',
  emotional_triggers text[] not null default '{}',
  favorite_scenarios text[] not null default '{}',
  past_exercises text[] not null default '{}',
  notes jsonb not null default '{}'::jsonb,
  last_session_id text,
  last_session_summary text not null default '',
  last_scenario_title text not null default '',
  last_session_at timestamptz,
  sessions_completed integer not null default 0,
  updated_at timestamptz not null default now()
);

create table if not exists public.reflections (
  session_id text primary key references public.practice_sessions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  went_well text not null,
  improve_next text not null,
  coach_satisfaction integer,
  created_at timestamptz not null default now()
);

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

create table if not exists public.waitlist_members (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'landing',
  created_at timestamptz not null default now(),
  constraint waitlist_members_email_key unique (email)
);

create index if not exists waitlist_members_created_at_idx
  on public.waitlist_members (created_at desc);

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

create or replace function public.current_profile_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_founder_or_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid()
      and role in ('founder', 'admin', 'system')
      and account_status = 'active'
  )
$$;

-- Create / sync profile after auth user is created (pending until email verified).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn text := coalesce(new.raw_user_meta_data->>'first_name', '');
  ln text := coalesce(new.raw_user_meta_data->>'last_name', '');
  dn text := trim(both from (fn || ' ' || ln));
begin
  if dn = '' then
    dn := coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1), 'Member');
  end if;

  insert into public.profiles (
    id,
    first_name,
    last_name,
    display_name,
    email,
    email_verified,
    account_status,
    role,
    must_change_password
  ) values (
    new.id,
    fn,
    ln,
    dn,
    coalesce(new.email, ''),
    coalesce(new.email_confirmed_at is not null, false),
    case when new.email_confirmed_at is not null then 'active' else 'pending' end,
    coalesce(new.raw_user_meta_data->>'role', 'user'),
    coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false)
  )
  on conflict (id) do update set
    email = excluded.email,
    first_name = coalesce(nullif(excluded.first_name, ''), profiles.first_name),
    last_name = coalesce(nullif(excluded.last_name, ''), profiles.last_name),
    display_name = coalesce(nullif(excluded.display_name, ''), profiles.display_name),
    email_verified = excluded.email_verified,
    account_status = case
      when excluded.email_verified then 'active'
      else profiles.account_status
    end,
    updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Promote profile when email is confirmed.
create or replace function public.handle_user_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    update public.profiles
    set
      email_verified = true,
      account_status = case when account_status = 'pending' then 'active' else account_status end,
      email = coalesce(new.email, email),
      updated_at = now()
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_confirmed on auth.users;
create trigger on_auth_user_email_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.handle_user_email_confirmed();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.reflections enable row level security;
alter table public.session_reports enable row level security;
alter table public.coach_memory enable row level security;
alter table public.founder_notes enable row level security;
alter table public.founder_briefs enable row level security;
alter table public.waitlist_members enable row level security;

drop trigger if exists coach_memory_set_updated_at on public.coach_memory;
create trigger coach_memory_set_updated_at
  before update on public.coach_memory
  for each row execute function public.set_updated_at();

-- Drop legacy open policies if present
drop policy if exists "profiles_anon_all" on public.profiles;
drop policy if exists "sessions_anon_all" on public.practice_sessions;
drop policy if exists "reflections_anon_all" on public.reflections;
drop policy if exists "founder_notes_anon_all" on public.founder_notes;
drop policy if exists "founder_briefs_anon_all" on public.founder_briefs;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_founder_or_admin());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (
    id = auth.uid()
    and role = (select p.role from public.profiles p where p.id = auth.uid())
  );

drop policy if exists "profiles_admin_update" on public.profiles;
create policy "profiles_admin_update"
  on public.profiles for update
  to authenticated
  using (public.is_founder_or_admin())
  with check (public.is_founder_or_admin());

drop policy if exists "sessions_own" on public.practice_sessions;
create policy "sessions_own"
  on public.practice_sessions for all
  to authenticated
  using (user_id = auth.uid() or public.is_founder_or_admin())
  with check (user_id = auth.uid());

drop policy if exists "reflections_own" on public.reflections;
create policy "reflections_own"
  on public.reflections for all
  to authenticated
  using (user_id = auth.uid() or public.is_founder_or_admin())
  with check (user_id = auth.uid());

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

drop policy if exists "founder_notes_staff" on public.founder_notes;
create policy "founder_notes_staff"
  on public.founder_notes for all
  to authenticated
  using (public.is_founder_or_admin())
  with check (public.is_founder_or_admin());

drop policy if exists "founder_briefs_staff" on public.founder_briefs;
create policy "founder_briefs_staff"
  on public.founder_briefs for all
  to authenticated
  using (public.is_founder_or_admin())
  with check (public.is_founder_or_admin());

drop policy if exists "waitlist_anon_insert" on public.waitlist_members;
create policy "waitlist_anon_insert"
  on public.waitlist_members for insert
  to anon, authenticated
  with check (true);

drop policy if exists "waitlist_staff_select" on public.waitlist_members;
create policy "waitlist_staff_select"
  on public.waitlist_members for select
  to authenticated
  using (public.is_founder_or_admin());
-- TalkForge founding members waitlist (LP-001)
-- Run in Supabase SQL editor before production waitlist goes live.

create table if not exists public.waitlist_members (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  source text not null default 'landing',
  created_at timestamptz not null default now(),
  constraint waitlist_members_email_key unique (email)
);

create index if not exists waitlist_members_created_at_idx
  on public.waitlist_members (created_at desc);

alter table public.waitlist_members enable row level security;

-- Public can join; cannot read others' emails.
drop policy if exists "waitlist_anon_insert" on public.waitlist_members;
create policy "waitlist_anon_insert"
  on public.waitlist_members for insert
  to anon, authenticated
  with check (true);

drop policy if exists "waitlist_anon_select_none" on public.waitlist_members;
-- No select policy for anon = emails stay private.
