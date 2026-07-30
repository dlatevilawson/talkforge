-- Phase 1 trust memory fields (ROADMAP-001)
-- Extends coach_memory so Forge can remember nickname, goals, challenges,
-- learning style, strengths, and emotional triggers — not just last session.

alter table public.coach_memory
  add column if not exists preferred_nickname text not null default '';

alter table public.coach_memory
  add column if not exists long_term_challenges text[] not null default '{}';

alter table public.coach_memory
  add column if not exists learning_style text not null default ''
    check (
      learning_style = ''
      or learning_style in (
        'practice_first',
        'reflect_first',
        'example_first',
        'challenge_first'
      )
    );

alter table public.coach_memory
  add column if not exists biggest_strength text not null default '';

alter table public.coach_memory
  add column if not exists emotional_triggers text[] not null default '{}';

alter table public.coach_memory
  add column if not exists last_session_at timestamptz;
