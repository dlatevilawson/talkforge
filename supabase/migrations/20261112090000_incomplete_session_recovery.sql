-- Durable activity marker for abandoned-session recovery.
-- Existing rows are initialized from their last known lifecycle timestamp;
-- no session is completed and no turns/history are rewritten by this migration.
alter table public.practice_sessions
  add column if not exists last_activity_at timestamptz;

update public.practice_sessions
set last_activity_at = coalesce(last_activity_at, completed_at, started_at)
where last_activity_at is null;

create index if not exists practice_sessions_incomplete_activity_idx
  on public.practice_sessions (last_activity_at)
  where completed_at is null;
