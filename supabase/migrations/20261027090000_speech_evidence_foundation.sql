-- Speech evidence foundation.
-- This migration is intentionally data-only: no member-facing speech UI.

create table if not exists public.speech_audio (
  session_id text primary key references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null unique,
  mime_type text not null,
  duration_seconds integer,
  created_at timestamptz not null default now()
);

create table if not exists public.speech_turns (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  turn_index integer not null,
  role text not null check (role in ('member','counterpart')),
  start_offset_ms integer,
  end_offset_ms integer,
  timing_source text not null default 'not_measured'
    check (timing_source in ('realtime_event','not_measured')),
  created_at timestamptz not null default now(),
  unique (session_id, turn_index)
);

create table if not exists public.speech_words (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  turn_id uuid references public.speech_turns(id) on delete cascade,
  word text not null,
  start_offset_ms integer,
  end_offset_ms integer,
  timing_source text not null default 'not_measured'
    check (timing_source in ('transcription','not_measured')),
  created_at timestamptz not null default now()
);

create table if not exists public.speech_metrics (
  session_id text primary key references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  filler_count integer,
  filler_density_per_100_words numeric(8,3),
  pace_wpm numeric(8,2),
  pause_count integer,
  pause_total_ms integer,
  longest_pause_ms integer,
  member_talk_time_pct numeric(6,3),
  member_speaking_time_ms integer,
  measured_at timestamptz,
  created_at timestamptz not null default now(),
  constraint speech_metrics_nonnegative check (
    (filler_count is null or filler_count >= 0) and
    (pause_count is null or pause_count >= 0) and
    (pause_total_ms is null or pause_total_ms >= 0) and
    (longest_pause_ms is null or longest_pause_ms >= 0) and
    (member_speaking_time_ms is null or member_speaking_time_ms >= 0) and
    (pace_wpm is null or pace_wpm >= 0) and
    (member_talk_time_pct is null or (member_talk_time_pct >= 0 and member_talk_time_pct <= 100))
  )
);

create table if not exists public.speech_filler_moments (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  word text not null,
  occurrence_index integer not null,
  start_offset_ms integer,
  end_offset_ms integer,
  replay_ref_id uuid,
  created_at timestamptz not null default now()
);

create table if not exists public.speech_pause_events (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_offset_ms integer,
  end_offset_ms integer,
  duration_ms integer,
  created_at timestamptz not null default now()
);

create table if not exists public.speech_pressure_segments (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  start_turn_index integer not null,
  end_turn_index integer not null,
  pressure_kind text not null check (pressure_kind in ('calm','pushback')),
  evidence text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.speech_replay_refs (
  id uuid primary key default gen_random_uuid(),
  session_id text not null references public.practice_sessions(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  audio_path text not null,
  start_offset_ms integer,
  end_offset_ms integer,
  created_at timestamptz not null default now()
);

alter table public.speech_filler_moments
  drop constraint if exists speech_filler_moments_replay_ref_id_fkey;
alter table public.speech_filler_moments
  add constraint speech_filler_moments_replay_ref_id_fkey
  foreign key (replay_ref_id) references public.speech_replay_refs(id) on delete set null;

create index if not exists speech_turns_session_idx on public.speech_turns(session_id, turn_index);
create index if not exists speech_words_session_idx on public.speech_words(session_id, created_at);
create index if not exists speech_filler_moments_session_idx on public.speech_filler_moments(session_id, occurrence_index);
create index if not exists speech_pause_events_session_idx on public.speech_pause_events(session_id, start_offset_ms);
create index if not exists speech_pressure_segments_session_idx on public.speech_pressure_segments(session_id, start_turn_index);
create index if not exists speech_replay_refs_session_idx on public.speech_replay_refs(session_id, start_offset_ms);

alter table public.speech_audio enable row level security;
alter table public.speech_turns enable row level security;
alter table public.speech_words enable row level security;
alter table public.speech_metrics enable row level security;
alter table public.speech_filler_moments enable row level security;
alter table public.speech_pause_events enable row level security;
alter table public.speech_pressure_segments enable row level security;
alter table public.speech_replay_refs enable row level security;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'speech_audio','speech_turns','speech_words','speech_metrics',
    'speech_filler_moments','speech_pause_events','speech_pressure_segments','speech_replay_refs'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_own', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))',
      table_name || '_own', table_name
    );
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'speech_audio','speech_turns','speech_words','speech_metrics',
    'speech_filler_moments','speech_pause_events','speech_pressure_segments','speech_replay_refs'
  ] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_insert_own', table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))',
      table_name || '_insert_own', table_name
    );
  end loop;
end $$;

do $$
declare
  table_name text;
begin
  foreach table_name in array array['speech_audio','speech_metrics'] loop
    execute format('drop policy if exists %I on public.%I', table_name || '_update_own', table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))',
      table_name || '_update_own', table_name
    );
  end loop;
end $$;

grant select on public.speech_audio, public.speech_turns, public.speech_words,
  public.speech_metrics, public.speech_filler_moments, public.speech_pause_events,
  public.speech_pressure_segments, public.speech_replay_refs to authenticated;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('speech-audio', 'speech-audio', false, 52428800, array['audio/webm','audio/mp4','audio/ogg','audio/wav'])
on conflict (id) do nothing;

drop policy if exists "speech_audio_owner_read" on storage.objects;
create policy "speech_audio_owner_read" on storage.objects
  for select to authenticated
  using (bucket_id = 'speech-audio' and owner_id = (select auth.uid()));

drop policy if exists "speech_audio_owner_insert" on storage.objects;
create policy "speech_audio_owner_insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'speech-audio' and
    (storage.foldername(name))[1] = (select auth.uid()::text)
  );

drop policy if exists "speech_audio_owner_delete" on storage.objects;
create policy "speech_audio_owner_delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'speech-audio' and owner_id = (select auth.uid()));

