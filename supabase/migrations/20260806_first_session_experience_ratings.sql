-- IV-UX-010 — First Session Experience Rating
-- Once-only emotional check-in after a member's first completed practice session.
-- Rows cascade away when the linked practice session is deleted (member reset).
-- Includes internal behavioral signals (not shown to members).

create table if not exists public.first_session_experience_ratings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  session_id text not null references public.practice_sessions (id) on delete cascade,
  star_rating integer check (
    star_rating is null or (star_rating >= 1 and star_rating <= 5)
  ),
  follow_up text,
  optional_comment text,
  dismissed boolean not null default false,
  -- Internal metrics (never shown in member UI)
  duration_seconds integer,
  session_completed boolean not null default true,
  started_another_session boolean not null default false,
  returned_within_24h boolean not null default false,
  returned_within_7d boolean not null default false,
  created_at timestamptz not null default now(),
  signals_updated_at timestamptz,
  constraint first_session_experience_ratings_response_chk check (
    (
      dismissed = true
      and star_rating is null
      and follow_up is null
      and optional_comment is null
    )
    or
    (
      dismissed = false
      and star_rating is not null
      and follow_up is not null
    )
  )
);

create index if not exists first_session_experience_ratings_session_id_idx
  on public.first_session_experience_ratings (session_id);

create index if not exists first_session_experience_ratings_created_at_idx
  on public.first_session_experience_ratings (created_at desc);

alter table public.first_session_experience_ratings enable row level security;

drop policy if exists "first_session_experience_ratings_own"
  on public.first_session_experience_ratings;
create policy "first_session_experience_ratings_own"
  on public.first_session_experience_ratings for all
  to authenticated
  using (user_id = auth.uid() or public.is_founder_or_admin())
  with check (user_id = auth.uid());

comment on table public.first_session_experience_ratings is
  'Once-only first-session check-in (IV-UX-010). Mission question + optional comment; behavioral signals are internal-only.';
