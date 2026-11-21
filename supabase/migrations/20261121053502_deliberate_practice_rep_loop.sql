alter table public.drill_completions
  add column if not exists next_target text;
