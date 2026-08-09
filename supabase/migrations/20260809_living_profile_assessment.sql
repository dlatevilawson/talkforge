-- Assessment Flow test slice — capture goals/strengths/challenges + inferred presence.
-- Narrow: does not add MatteringConversation tables, milestones, or evidence packs.

alter table public.living_profiles
  add column if not exists presence_scores jsonb;

alter table public.living_profiles
  add column if not exists goals text[] not null default '{}';

alter table public.living_profiles
  add column if not exists strengths text[] not null default '{}';

alter table public.living_profiles
  add column if not exists challenges text[] not null default '{}';

alter table public.living_profiles
  add column if not exists profile_source text;

do $migration$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'living_profiles_profile_source_check'
      and conrelid = 'public.living_profiles'::regclass
  ) then
    alter table public.living_profiles
      add constraint living_profiles_profile_source_check
      check (
        profile_source is null
        or profile_source in ('quick_pick', 'assessment', 'incomplete')
      );
  end if;
end
$migration$;

comment on column public.living_profiles.presence_scores is
  'Inferred 1–10 skill scores from assessment conversation (test slice).';
comment on column public.living_profiles.goals is
  'Goals surfaced during assessment (test slice).';
comment on column public.living_profiles.strengths is
  'Strengths surfaced during assessment (test slice).';
comment on column public.living_profiles.challenges is
  'Challenges surfaced during assessment (test slice).';
comment on column public.living_profiles.profile_source is
  'How the current snapshot was captured: quick_pick | assessment | incomplete.';
