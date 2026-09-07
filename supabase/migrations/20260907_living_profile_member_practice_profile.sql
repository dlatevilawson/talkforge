-- Decision 060 / 4B.W2 — member-declared Coach card wizard practice profile.
-- The field remains inside the Living Profile SSOT. It is written only through
-- the authorized server-side member mutation path; Forge is read-only.

alter table public.living_profiles
  add column if not exists member_practice_profile jsonb not null default '{}'::jsonb;

comment on column public.living_profiles.member_practice_profile is
  'Verified member-declared Coach card wizard selections with server-owned timestamps and provenance. Not System 1 evidence or insights; Forge reads but never writes.';
