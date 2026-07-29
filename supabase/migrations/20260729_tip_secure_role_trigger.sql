-- TIP-001 security fix: never trust client-supplied role metadata on signup.
-- Staff roles (founder/admin/system) are assigned only by service-role tooling
-- or FOUNDER_USER_IDS sync — not by auth.users raw_user_meta_data.role.

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
  -- Only service-role / admin creates may set elevated roles via app_metadata.
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
    -- Never downgrade or self-elevate via conflict path from user metadata.
    updated_at = now();

  return new;
end;
$$;
