-- HARDEN-002 Milestone 4.3 — provenance-safe legacy identity repair.
-- Import-only rows are converted back to pending evidence. Other rows retain
-- member edits, but any legacy import marker is explicitly unconfirmed.

update public.living_profiles lp
set
  provenance = (
    select coalesce(
      jsonb_agg(
        case
          when item->>'sourceKind' = 'imported' then
            item || jsonb_build_object(
              'memberConfirmed', false,
              'confidence', 'low',
              'updatedAt', now()::text
            )
          else item
        end
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(lp.provenance) item
  )
  || case when lp.preferred_nickname <> '' then jsonb_build_array(
    jsonb_build_object(
      'id', 'prov_legacy_preferredNickname_' || lp.user_id::text,
      'fieldPath', 'preferredNickname',
      'claim', lp.preferred_nickname,
      'sourceKind', 'imported',
      'evidenceRefs', jsonb_build_array('coach_memory'),
      'confidence', 'low',
      'createdAt', now()::text,
      'updatedAt', now()::text,
      'memberConfirmed', false
    )
  ) else '[]'::jsonb end
  || case when lp.purpose_statement <> '' then jsonb_build_array(
    jsonb_build_object(
      'id', 'prov_legacy_purposeStatement_' || lp.user_id::text,
      'fieldPath', 'purposeStatement',
      'claim', lp.purpose_statement,
      'sourceKind', 'imported',
      'evidenceRefs', jsonb_build_array('coach_memory'),
      'confidence', 'low',
      'createdAt', now()::text,
      'updatedAt', now()::text,
      'memberConfirmed', false
    )
  ) else '[]'::jsonb end
  || case when lp.personal_principles <> '[]'::jsonb then jsonb_build_array(
    jsonb_build_object(
      'id', 'prov_legacy_personalPrinciples_' || lp.user_id::text,
      'fieldPath', 'personalPrinciples',
      'claim', lp.personal_principles::text,
      'sourceKind', 'imported',
      'evidenceRefs', jsonb_build_array('coach_memory'),
      'confidence', 'low',
      'createdAt', now()::text,
      'updatedAt', now()::text,
      'memberConfirmed', false
    )
  ) else '[]'::jsonb end
  || case when lp.seasons <> '[]'::jsonb then jsonb_build_array(
    jsonb_build_object(
      'id', 'prov_legacy_seasons_' || lp.user_id::text,
      'fieldPath', 'seasons',
      'claim', lp.seasons::text,
      'sourceKind', 'imported',
      'evidenceRefs', jsonb_build_array('coach_memory'),
      'confidence', 'low',
      'createdAt', now()::text,
      'updatedAt', now()::text,
      'memberConfirmed', false
    )
  ) else '[]'::jsonb end
  || case when lp.preferred_coaching_style <> '' then jsonb_build_array(
    jsonb_build_object(
      'id', 'prov_legacy_preferredCoachingStyle_' || lp.user_id::text,
      'fieldPath', 'preferredCoachingStyle',
      'claim', lp.preferred_coaching_style,
      'sourceKind', 'imported',
      'evidenceRefs', jsonb_build_array('coach_memory'),
      'confidence', 'low',
      'createdAt', now()::text,
      'updatedAt', now()::text,
      'memberConfirmed', false
    )
  ) else '[]'::jsonb end,
  preferred_nickname = '',
  purpose_statement = '',
  personal_principles = '[]'::jsonb,
  seasons = '[]'::jsonb,
  preferred_coaching_style = '',
  version = version + 1,
  updated_at = now()
where jsonb_array_length(lp.provenance) = 1
  and lp.provenance->0->>'sourceKind' = 'imported'
  and (
    lp.preferred_nickname <> ''
    or lp.purpose_statement <> ''
    or lp.personal_principles <> '[]'::jsonb
    or lp.seasons <> '[]'::jsonb
    or lp.preferred_coaching_style <> ''
  );

update public.living_profiles lp
set
  provenance = (
    select coalesce(
      jsonb_agg(
        case
          when item->>'sourceKind' = 'imported' then
            item || jsonb_build_object(
              'memberConfirmed', false,
              'confidence', 'low',
              'updatedAt', now()::text
            )
          else item
        end
      ),
      '[]'::jsonb
    )
    from jsonb_array_elements(lp.provenance) item
  ),
  version = version + 1,
  updated_at = now()
where exists (
  select 1
  from jsonb_array_elements(lp.provenance) item
  where item->>'sourceKind' = 'imported'
    and coalesce((item->>'memberConfirmed')::boolean, false)
);
