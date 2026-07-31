-- Living coach profile + one lasting session insight
-- Phase 1.5: Forge remembers who you're becoming, not just what you practiced.

alter table public.session_reports
  add column if not exists session_insight text not null default '';

alter table public.session_reports
  add column if not exists emotional_note text not null default '';

alter table public.session_reports
  add column if not exists pattern_noticed text not null default '';

alter table public.coach_memory
  add column if not exists communication_strengths text[] not null default '{}';

alter table public.coach_memory
  add column if not exists growth_areas text[] not null default '{}';

alter table public.coach_memory
  add column if not exists motivators text[] not null default '{}';

alter table public.coach_memory
  add column if not exists known_patterns text[] not null default '{}';

alter table public.coach_memory
  add column if not exists emotional_notes text[] not null default '{}';

alter table public.coach_memory
  add column if not exists long_term_goal text not null default '';

alter table public.coach_memory
  add column if not exists last_session_insight text not null default '';
