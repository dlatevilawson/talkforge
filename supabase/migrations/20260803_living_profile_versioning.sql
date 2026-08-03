-- HARDEN-002 Milestone 4.2 — optimistic concurrency for Living Profile.
-- Application writes compare the version they read and increment exactly once.

alter table public.living_profiles
  add column if not exists version bigint not null default 1;

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'living_profiles_version_positive'
      and conrelid = 'public.living_profiles'::regclass
  ) then
    alter table public.living_profiles
      add constraint living_profiles_version_positive check (version >= 1);
  end if;
end
$migration$;

comment on column public.living_profiles.version is
  'Optimistic-concurrency token; compare current value and increment on each write.';
