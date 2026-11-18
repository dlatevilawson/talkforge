alter table public.training_plans
  add column if not exists daily_minutes integer;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'training_plans_daily_minutes_check'
      and conrelid = 'public.training_plans'::regclass
  ) then
    alter table public.training_plans
      add constraint training_plans_daily_minutes_check
      check (daily_minutes is null or daily_minutes in (5, 10, 15));
  end if;
end $$;
