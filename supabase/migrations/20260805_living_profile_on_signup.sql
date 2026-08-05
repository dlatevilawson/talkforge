-- Create a Living Profile row atomically with every new auth user.
-- Fixes BS-012: LP must not depend on first ContinuityHome/practice hit.
-- Security: role still sourced only from raw_app_meta_data (HARDEN / tip trigger).

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
  now_ts timestamptz := now();
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
    updated_at = now_ts;

  if to_regclass('public.living_profiles') is not null then
    insert into public.living_profiles (
      user_id,
      version,
      display_name,
      preferred_nickname,
      purpose_statement,
      personal_principles,
      seasons,
      coaching_intensity,
      preferred_coaching_style,
      mattering_conversation_ids,
      provenance,
      updated_at
    ) values (
      new.id,
      1,
      dn,
      '',
      '',
      '[]'::jsonb,
      '[]'::jsonb,
      'steady',
      '',
      '{}'::text[],
      jsonb_build_array(
        jsonb_build_object(
          'id', 'prov_signup_' || new.id::text,
          'fieldPath', 'displayName',
          'claim', dn,
          'sourceKind', 'member_declared',
          'evidenceRefs', jsonb_build_array('signup'),
          'confidence', 'high',
          'createdAt', now_ts::text,
          'updatedAt', now_ts::text,
          'memberConfirmed', true
        )
      ),
      now_ts
    )
    on conflict (user_id) do update set
      display_name = coalesce(nullif(excluded.display_name, ''), living_profiles.display_name),
      updated_at = now_ts;
  end if;

  return new;
end;
$$;

-- Backfill any authenticated members still missing a Living Profile row.
insert into public.living_profiles (
  user_id,
  version,
  display_name,
  preferred_nickname,
  purpose_statement,
  personal_principles,
  seasons,
  coaching_intensity,
  preferred_coaching_style,
  mattering_conversation_ids,
  provenance,
  updated_at
)
select
  p.id,
  1,
  coalesce(nullif(trim(p.display_name), ''), split_part(coalesce(p.email, 'Member'), '@', 1), 'Member'),
  '',
  '',
  '[]'::jsonb,
  '[]'::jsonb,
  'steady',
  '',
  '{}'::text[],
  jsonb_build_array(
    jsonb_build_object(
      'id', 'prov_backfill_' || p.id::text,
      'fieldPath', 'displayName',
      'claim', coalesce(nullif(trim(p.display_name), ''), 'Member'),
      'sourceKind', 'member_declared',
      'evidenceRefs', jsonb_build_array('account_profile'),
      'confidence', 'high',
      'createdAt', now()::text,
      'updatedAt', now()::text,
      'memberConfirmed', true
    )
  ),
  now()
from public.profiles p
where not exists (
  select 1 from public.living_profiles lp where lp.user_id = p.id
);
