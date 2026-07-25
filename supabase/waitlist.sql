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
