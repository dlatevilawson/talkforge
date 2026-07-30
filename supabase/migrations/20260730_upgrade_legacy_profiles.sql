-- 20260730_upgrade_legacy_profiles.sql
-- Idempotent upgrade: legacy guest MVP profiles → AUTH-001 / TIP profiles.
--
-- Production starting point (legacy):
--   public.profiles (id text PK, display_name text, created_at timestamptz)
--   public.practice_sessions.user_id text → profiles(id)
--   public.reflections.user_id text → profiles(id)
--
-- Target: AUTH-001 uuid identity schema + TIP secure signup trigger + RLS.
-- Safe to re-run. Does not DROP live member data that maps to auth.users.
-- Non-UUID guest rows and orphan UUID rows are archived (not deleted).

-- ---------------------------------------------------------------------------
-- 0) Helpers for idempotent DDL
-- ---------------------------------------------------------------------------

create or replace function public._tf_is_uuid_text(value text)
returns boolean
language sql
immutable
as $$
  select value ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
$$;

create or replace function public._tf_profiles_id_type()
returns text
language sql
stable
as $$
  select data_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'profiles'
    and column_name = 'id';
$$;

-- ---------------------------------------------------------------------------
-- 1) Archive tables (preserve guest / orphan rows — never hard-delete)
-- ---------------------------------------------------------------------------

create table if not exists public.legacy_guest_profiles (
  id text primary key,
  display_name text not null,
  created_at timestamptz,
  archived_at timestamptz not null default now(),
  archive_reason text not null
);

create table if not exists public.legacy_guest_practice_sessions (
  id text primary key,
  user_id text not null,
  scenario_id text,
  scenario_title text,
  mission_prompt text,
  started_at timestamptz,
  completed_at timestamptz,
  average_score integer,
  turns jsonb,
  created_at timestamptz,
  archived_at timestamptz not null default now(),
  archive_reason text not null
);

create table if not exists public.legacy_guest_reflections (
  session_id text primary key,
  user_id text not null,
  went_well text,
  improve_next text,
  coach_satisfaction integer,
  created_at timestamptz,
  archived_at timestamptz not null default now(),
  archive_reason text not null
);

-- ---------------------------------------------------------------------------
-- 2) Drop legacy open policies + FK constraints that block type changes
-- ---------------------------------------------------------------------------

drop policy if exists "profiles_anon_all" on public.profiles;
drop policy if exists "sessions_anon_all" on public.practice_sessions;
drop policy if exists "reflections_anon_all" on public.reflections;
drop policy if exists "founder_notes_anon_all" on public.founder_notes;
drop policy if exists "founder_briefs_anon_all" on public.founder_briefs;

do $$
declare
  r record;
begin
  -- Drop FKs that reference public.profiles (blocks id type change).
  for r in
    select c.conname, c.conrelid::regclass as tbl
    from pg_constraint c
    where c.contype = 'f'
      and c.confrelid = 'public.profiles'::regclass
  loop
    execute format('alter table %s drop constraint if exists %I', r.tbl, r.conname);
  end loop;

  -- Drop FKs from reflections → practice_sessions only if we need session moves;
  -- keep session PK as text. No action required here for user_id conversion.
end $$;

-- ---------------------------------------------------------------------------
-- 3) Archive incompatible profile rows + dependents (only while id is text)
-- ---------------------------------------------------------------------------

do $$
begin
  if public._tf_profiles_id_type() = 'text' then
    -- 3a) Non-UUID guest ids (e.g. guest_…)
    insert into public.legacy_guest_profiles (id, display_name, created_at, archive_reason)
    select p.id, p.display_name, p.created_at, 'non_uuid_guest_id'
    from public.profiles p
    where not public._tf_is_uuid_text(p.id)
    on conflict (id) do nothing;

    insert into public.legacy_guest_practice_sessions (
      id, user_id, scenario_id, scenario_title, mission_prompt,
      started_at, completed_at, average_score, turns, created_at, archive_reason
    )
    select s.id, s.user_id, s.scenario_id, s.scenario_title, s.mission_prompt,
           s.started_at, s.completed_at, s.average_score, s.turns, s.created_at,
           'non_uuid_guest_id'
    from public.practice_sessions s
    where not public._tf_is_uuid_text(s.user_id)
    on conflict (id) do nothing;

    insert into public.legacy_guest_reflections (
      session_id, user_id, went_well, improve_next, coach_satisfaction,
      created_at, archive_reason
    )
    select r.session_id, r.user_id, r.went_well, r.improve_next, r.coach_satisfaction,
           r.created_at, 'non_uuid_guest_id'
    from public.reflections r
    where not public._tf_is_uuid_text(r.user_id)
    on conflict (session_id) do nothing;

    delete from public.reflections r
    where not public._tf_is_uuid_text(r.user_id);

    delete from public.practice_sessions s
    where not public._tf_is_uuid_text(s.user_id);

    delete from public.profiles p
    where not public._tf_is_uuid_text(p.id);

    -- 3b) UUID-shaped ids with no matching auth.users row (cannot satisfy FK)
    insert into public.legacy_guest_profiles (id, display_name, created_at, archive_reason)
    select p.id, p.display_name, p.created_at, 'uuid_without_auth_user'
    from public.profiles p
    where public._tf_is_uuid_text(p.id)
      and not exists (
        select 1 from auth.users u where u.id::text = p.id
      )
    on conflict (id) do nothing;

    insert into public.legacy_guest_practice_sessions (
      id, user_id, scenario_id, scenario_title, mission_prompt,
      started_at, completed_at, average_score, turns, created_at, archive_reason
    )
    select s.id, s.user_id, s.scenario_id, s.scenario_title, s.mission_prompt,
           s.started_at, s.completed_at, s.average_score, s.turns, s.created_at,
           'uuid_without_auth_user'
    from public.practice_sessions s
    where public._tf_is_uuid_text(s.user_id)
      and not exists (
        select 1 from auth.users u where u.id::text = s.user_id
      )
    on conflict (id) do nothing;

    insert into public.legacy_guest_reflections (
      session_id, user_id, went_well, improve_next, coach_satisfaction,
      created_at, archive_reason
    )
    select r.session_id, r.user_id, r.went_well, r.improve_next, r.coach_satisfaction,
           r.created_at, 'uuid_without_auth_user'
    from public.reflections r
    where public._tf_is_uuid_text(r.user_id)
      and not exists (
        select 1 from auth.users u where u.id::text = r.user_id
      )
    on conflict (session_id) do nothing;

    delete from public.reflections r
    where public._tf_is_uuid_text(r.user_id)
      and not exists (
        select 1 from auth.users u where u.id::text = r.user_id
      );

    delete from public.practice_sessions s
    where public._tf_is_uuid_text(s.user_id)
      and not exists (
        select 1 from auth.users u where u.id::text = s.user_id
      );

    delete from public.profiles p
    where public._tf_is_uuid_text(p.id)
      and not exists (
        select 1 from auth.users u where u.id::text = p.id
      );
  end if;
end $$;

-- ---------------------------------------------------------------------------
-- 4) Add AUTH-001 columns onto existing profiles (preserve rows)
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists first_name text not null default '',
  add column if not exists last_name text not null default '',
  add column if not exists email text not null default '',
  add column if not exists email_verified boolean not null default false,
  add column if not exists last_login_at timestamptz,
  add column if not exists account_status text not null default 'pending',
  add column if not exists role text not null default 'user',
  add column if not exists time_zone text not null default 'UTC',
  add column if not exists preferred_language text not null default 'en',
  add column if not exists onboarding_complete boolean not null default false,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists updated_at timestamptz not null default now();

-- Ensure display_name has a default going forward (legacy had none).
alter table public.profiles
  alter column display_name set default '';

-- ---------------------------------------------------------------------------
-- 5) Convert profiles.id text → uuid and attach auth.users FK
-- ---------------------------------------------------------------------------

do $$
begin
  if public._tf_profiles_id_type() = 'text' then
    alter table public.profiles
      alter column id type uuid using id::uuid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_id_fkey'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 6) Convert dependent user_id columns text → uuid + restore FKs
-- ---------------------------------------------------------------------------

do $$
declare
  sessions_user_type text;
  reflections_user_type text;
begin
  select data_type into sessions_user_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'practice_sessions'
    and column_name = 'user_id';

  select data_type into reflections_user_type
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'reflections'
    and column_name = 'user_id';

  if sessions_user_type = 'text' then
    -- Defensive cleanup for any leftover incompatible rows
    delete from public.practice_sessions s
    where not public._tf_is_uuid_text(s.user_id)
       or not exists (select 1 from public.profiles p where p.id::text = s.user_id);

    alter table public.practice_sessions
      alter column user_id type uuid using user_id::uuid;
  end if;

  if reflections_user_type = 'text' then
    delete from public.reflections r
    where not public._tf_is_uuid_text(r.user_id)
       or not exists (select 1 from public.profiles p where p.id::text = r.user_id);

    alter table public.reflections
      alter column user_id type uuid using user_id::uuid;
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'practice_sessions_user_id_fkey'
      and conrelid = 'public.practice_sessions'::regclass
  ) then
    alter table public.practice_sessions
      add constraint practice_sessions_user_id_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
exception when duplicate_object then null;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'reflections_user_id_fkey'
      and conrelid = 'public.reflections'::regclass
  ) then
    alter table public.reflections
      add constraint reflections_user_id_fkey
      foreign key (user_id) references public.profiles (id) on delete cascade;
  end if;
exception when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- 7) Constraints + indexes
-- ---------------------------------------------------------------------------

do $$
begin
  alter table public.profiles
    add constraint profiles_account_status_check
    check (account_status in ('pending', 'active', 'suspended', 'deleted'));
exception when duplicate_object then null;
end $$;

do $$
begin
  alter table public.profiles
    add constraint profiles_role_check
    check (role in ('guest', 'user', 'premium', 'founder', 'admin', 'system'));
exception when duplicate_object then null;
end $$;

create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_account_status_idx on public.profiles (account_status);

-- ---------------------------------------------------------------------------
-- 8) Backfill identity fields from auth.users (preserve display_name)
-- ---------------------------------------------------------------------------

update public.profiles p
set
  email = coalesce(nullif(p.email, ''), u.email, ''),
  email_verified = coalesce(u.email_confirmed_at is not null, p.email_verified),
  account_status = case
    when u.email_confirmed_at is not null then 'active'
    else p.account_status
  end,
  display_name = coalesce(
    nullif(p.display_name, ''),
    nullif(u.raw_user_meta_data->>'display_name', ''),
    split_part(coalesce(u.email, ''), '@', 1),
    'Member'
  ),
  updated_at = now()
from auth.users u
where p.id = u.id;

-- Ensure every auth user has a profile row (existing accounts pre-dating triggers).
insert into public.profiles (
  id,
  first_name,
  last_name,
  display_name,
  email,
  email_verified,
  account_status,
  role,
  onboarding_complete,
  must_change_password
)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'first_name', ''),
  coalesce(u.raw_user_meta_data->>'last_name', ''),
  coalesce(
    nullif(u.raw_user_meta_data->>'display_name', ''),
    split_part(coalesce(u.email, ''), '@', 1),
    'Member'
  ),
  coalesce(u.email, ''),
  coalesce(u.email_confirmed_at is not null, false),
  case when u.email_confirmed_at is not null then 'active' else 'pending' end,
  'user',
  false,
  false
from auth.users u
where not exists (
  select 1 from public.profiles p where p.id = u.id
)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 9) Ensure companion AUTH-001 tables exist
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
  created_at timestamptz not null default now()
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
-- 10) Triggers + helper functions (TIP secure role assignment)
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

-- TIP-001: never trust client-supplied role metadata on signup.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fn text := coalesce(new.raw_user_meta_data->>'first_name', '');
  ln text := coalesce(new.raw_user_meta_data->>'last_name', '');
  dn text := coalesce(nullif(trim(new.raw_user_meta_data->>'display_name'), ''), '');
  must_change boolean := coalesce((new.raw_user_meta_data->>'must_change_password')::boolean, false);
  elevated text := coalesce(new.raw_app_meta_data->>'role', '');
  assigned_role text := 'user';
begin
  if elevated in ('founder', 'admin', 'system') then
    assigned_role := elevated;
  end if;

  if dn = '' then
    dn := trim(both from (fn || ' ' || ln));
  end if;
  if dn = '' then
    dn := coalesce(split_part(new.email, '@', 1), 'Member');
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
    assigned_role,
    must_change
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
-- 11) RLS (identity-scoped; replace guest-open policies)
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.practice_sessions enable row level security;
alter table public.reflections enable row level security;
alter table public.founder_notes enable row level security;
alter table public.founder_briefs enable row level security;
alter table public.waitlist_members enable row level security;

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

-- ---------------------------------------------------------------------------
-- 12) Cleanup temporary helpers (keep archive tables)
-- ---------------------------------------------------------------------------

drop function if exists public._tf_is_uuid_text(text);
drop function if exists public._tf_profiles_id_type();

-- Done.
-- Optional follow-up (Founder promotion), run separately after verifying schema:
--   update public.profiles
--   set role = 'founder', account_status = 'active', email_verified = true,
--       onboarding_complete = true, must_change_password = false
--   where lower(email) = 'd.latevilawson@gmail.com';
