-- Living Profile SSOT (POM-001 · LP-LAW-001 · AUDIT Conditional GO)
-- Production migration for living_profiles.
-- Experiences never write identity fields; provenance may hold unconfirmed proposals.

create table if not exists public.living_profiles (
  user_id uuid primary key
    references public.profiles (id) on delete cascade,
  display_name text not null default '',
  preferred_nickname text not null default '',
  purpose_statement text not null default '',
  personal_principles jsonb not null default '[]'::jsonb,
  seasons jsonb not null default '[]'::jsonb,
  coaching_intensity text not null default 'steady'
    check (coaching_intensity in ('gentle', 'steady', 'direct', 'challenging')),
  preferred_coaching_style text not null default '',
  mattering_conversation_ids text[] not null default '{}',
  provenance jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.living_profiles enable row level security;

drop trigger if exists living_profiles_set_updated_at on public.living_profiles;
create trigger living_profiles_set_updated_at
  before update on public.living_profiles
  for each row execute function public.set_updated_at();

drop policy if exists "living_profiles_own" on public.living_profiles;
create policy "living_profiles_own"
  on public.living_profiles for all
  to authenticated
  using (user_id = auth.uid() or public.is_founder_or_admin())
  with check (user_id = auth.uid());

-- One-time backfill: declared coach_memory fields → Living Profile when LP row absent.
-- Does NOT copy session-inferred identity (strengths/habits/confidence).
insert into public.living_profiles (
  user_id,
  display_name,
  preferred_nickname,
  purpose_statement,
  personal_principles,
  seasons,
  preferred_coaching_style,
  provenance,
  updated_at
)
select
  cm.user_id,
  coalesce(cm.display_name, ''),
  coalesce(cm.preferred_nickname, ''),
  coalesce(cm.communication_goals[1], ''),
  case
    when coalesce(array_length(cm.communication_goals, 1), 0) > 1 then (
      select jsonb_agg(
        jsonb_build_object(
          'id', 'prin_import_' || gs.i::text,
          'text', cm.communication_goals[gs.i],
          'declaredBy', 'member',
          'provenanceId', null,
          'createdAt', now()::text
        )
      )
      from generate_series(2, array_length(cm.communication_goals, 1)) as gs(i)
    )
    else '[]'::jsonb
  end,
  case
    when coalesce(array_length(cm.long_term_challenges, 1), 0) > 0 then (
      select jsonb_agg(
        jsonb_build_object(
          'id', 'season_import_' || gs.i::text,
          'kind', 'other',
          'label', cm.long_term_challenges[gs.i],
          'rank', case when gs.i = 1 then 'primary' else 'secondary' end,
          'notes', '',
          'startedAt', null
        )
      )
      from generate_series(1, array_length(cm.long_term_challenges, 1)) as gs(i)
    )
    else '[]'::jsonb
  end,
  coalesce(cm.preferred_coaching_style, ''),
  jsonb_build_array(
    jsonb_build_object(
      'id', 'prov_import_' || cm.user_id::text,
      'fieldPath', 'imported_from_coach_memory',
      'claim', 'Backfilled member-declared fields from coach_memory (identity migration)',
      'sourceKind', 'imported',
      'evidenceRefs', jsonb_build_array('coach_memory'),
      'confidence', 'medium',
      'createdAt', now()::text,
      'updatedAt', now()::text,
      'memberConfirmed', true
    )
  ),
  now()
from public.coach_memory cm
where not exists (
  select 1 from public.living_profiles lp where lp.user_id = cm.user_id
)
and (
  coalesce(cm.preferred_nickname, '') <> ''
  or coalesce(array_length(cm.communication_goals, 1), 0) > 0
  or coalesce(array_length(cm.long_term_challenges, 1), 0) > 0
  or coalesce(cm.preferred_coaching_style, '') <> ''
);
