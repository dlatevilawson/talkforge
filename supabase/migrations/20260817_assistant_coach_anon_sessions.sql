-- Phase 4B.2 — Assistant Coach anonymous session schema + 14-day TTL
-- (Decision 059 / OD-2 / OD-3 substrate; no cookies, HTTP, or UI in this slice).
-- Access model: RLS enabled with no anon/authenticated policies + REVOKE from
-- those roles. Browser clients must not touch these tables; service_role /
-- server routes only (service_role bypasses RLS).

-- ---------------------------------------------------------------------------
-- Sessions
-- ---------------------------------------------------------------------------
create table if not exists public.assistant_coach_sessions (
  id uuid primary key default gen_random_uuid(),
  anon_key_hash text,
  user_id uuid references public.profiles (id) on delete set null,
  status text not null default 'active'
    check (status in ('active', 'gated', 'claimed', 'expired', 'handed_off')),
  turn_count integer not null default 0
    check (turn_count >= 0),
  has_experienced_value boolean not null default false,
  expires_at timestamptz not null default (now() + interval '14 days'),
  claimed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint assistant_coach_sessions_claimed_requires_user
    check (
      status <> 'claimed'
      or (user_id is not null and claimed_at is not null)
    )
);

create index if not exists assistant_coach_sessions_expires_at_idx
  on public.assistant_coach_sessions (expires_at);

create index if not exists assistant_coach_sessions_user_id_idx
  on public.assistant_coach_sessions (user_id);

-- Unique anon key while session is still anonymously usable.
create unique index if not exists assistant_coach_sessions_anon_key_hash_active_uidx
  on public.assistant_coach_sessions (anon_key_hash)
  where anon_key_hash is not null
    and status in ('active', 'gated');

drop trigger if exists assistant_coach_sessions_set_updated_at
  on public.assistant_coach_sessions;
create trigger assistant_coach_sessions_set_updated_at
  before update on public.assistant_coach_sessions
  for each row execute function public.set_updated_at();

comment on table public.assistant_coach_sessions is
  'Assistant Coach session ownership/TTL plane (4B.2). Server/service_role only until claim APIs exist.';
comment on column public.assistant_coach_sessions.anon_key_hash is
  'Hash of anonymous cookie secret material. Never store raw cookie values.';
comment on column public.assistant_coach_sessions.expires_at is
  'Anonymous TTL (Decision 059 / OD-2): default now() + 14 days.';
comment on column public.assistant_coach_sessions.has_experienced_value is
  'Sticky semantic conversion flag (server-authored). Not the turn safety cap.';

-- ---------------------------------------------------------------------------
-- Messages
-- ---------------------------------------------------------------------------
create table if not exists public.assistant_coach_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null
    references public.assistant_coach_sessions (id) on delete cascade,
  turn_index integer not null
    check (turn_index >= 0),
  role text not null
    check (role in ('user', 'assistant')),
  content text not null default '',
  model_meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint assistant_coach_messages_session_turn_role_uidx
    unique (session_id, turn_index, role)
);

create index if not exists assistant_coach_messages_session_id_idx
  on public.assistant_coach_messages (session_id, turn_index);

comment on table public.assistant_coach_messages is
  'Assistant Coach conversation turns for continuity/claim. Server/service_role only.';

-- ---------------------------------------------------------------------------
-- Profile drafts (provisional LP — not living_profiles until claim)
-- ---------------------------------------------------------------------------
create table if not exists public.assistant_coach_profile_drafts (
  session_id uuid primary key
    references public.assistant_coach_sessions (id) on delete cascade,
  profile_json jsonb not null default '{}'::jsonb,
  version bigint not null default 1
    check (version >= 1),
  updated_at timestamptz not null default now()
);

drop trigger if exists assistant_coach_profile_drafts_set_updated_at
  on public.assistant_coach_profile_drafts;
create trigger assistant_coach_profile_drafts_set_updated_at
  before update on public.assistant_coach_profile_drafts
  for each row execute function public.set_updated_at();

comment on table public.assistant_coach_profile_drafts is
  'Provisional Living Profile-shaped draft for anonymous AC sessions. Not identity SSOT; merge into living_profiles only on claim (later slice).';
comment on column public.assistant_coach_profile_drafts.profile_json is
  'Full LivingProfile-shaped JSON including evidence_ledger/profile_insights arrays.';

-- ---------------------------------------------------------------------------
-- RLS: deny browser roles; service_role bypasses RLS
-- ---------------------------------------------------------------------------
alter table public.assistant_coach_sessions enable row level security;
alter table public.assistant_coach_messages enable row level security;
alter table public.assistant_coach_profile_drafts enable row level security;

-- Explicitly no policies for anon/authenticated → no direct client access.
revoke all on table public.assistant_coach_sessions from anon, authenticated;
revoke all on table public.assistant_coach_messages from anon, authenticated;
revoke all on table public.assistant_coach_profile_drafts from anon, authenticated;

grant all on table public.assistant_coach_sessions to service_role;
grant all on table public.assistant_coach_messages to service_role;
grant all on table public.assistant_coach_profile_drafts to service_role;
