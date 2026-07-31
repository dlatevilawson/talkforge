-- Phase 8 — Purpose Alignment
-- Forge remembers user-declared goals, milestones, and commitments.
-- Law #014: remember what matters; never decide what should matter.

alter table public.coach_memory
  add column if not exists north_star text not null default '';

alter table public.coach_memory
  add column if not exists life_vision text not null default '';

alter table public.coach_memory
  add column if not exists person_they_want_to_become text not null default '';

alter table public.coach_memory
  add column if not exists compass_relationships text not null default '';

alter table public.coach_memory
  add column if not exists compass_learning text not null default '';

alter table public.coach_memory
  add column if not exists compass_health text not null default '';

alter table public.coach_memory
  add column if not exists career_goals text[] not null default '{}';

alter table public.coach_memory
  add column if not exists family_goals text[] not null default '{}';

alter table public.coach_memory
  add column if not exists health_goals text[] not null default '{}';

alter table public.coach_memory
  add column if not exists business_goals text[] not null default '{}';

alter table public.coach_memory
  add column if not exists learning_goals text[] not null default '{}';

alter table public.coach_memory
  add column if not exists life_milestones jsonb not null default '[]'::jsonb;

alter table public.coach_memory
  add column if not exists commitments jsonb not null default '[]'::jsonb;

alter table public.coach_memory
  add column if not exists last_vision_check_at timestamptz;
