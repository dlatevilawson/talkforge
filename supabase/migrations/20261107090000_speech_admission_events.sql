create table if not exists public.speech_admission_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  item_id text,
  transcript_text text not null,
  decision text not null check (decision in ('held','admitted','dropped','control')),
  reason text not null,
  observed_at timestamptz not null,
  created_at timestamptz not null default now()
);

create index if not exists speech_admission_events_session_idx
  on public.speech_admission_events(session_id, observed_at);

alter table public.speech_admission_events enable row level security;
drop policy if exists speech_admission_events_own on public.speech_admission_events;
create policy speech_admission_events_own on public.speech_admission_events
  for select to authenticated using (user_id = (select auth.uid()));
drop policy if exists speech_admission_events_insert_own on public.speech_admission_events;
create policy speech_admission_events_insert_own on public.speech_admission_events
  for insert to authenticated with check (user_id = (select auth.uid()));

grant delete, insert, references, select, update on public.speech_admission_events to authenticated;
revoke truncate, trigger on public.speech_admission_events from authenticated;

