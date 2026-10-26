-- Phase 1 journey layer: one member plan composed of two-week program blocks.
-- Drill-library tables are created by 20261022090000_drill_library_blank_page.sql.

create table if not exists public.training_plans (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('6_week','6_month')),
  occasion_text text not null default '',
  occasion_date date,
  starts_on date not null default current_date,
  ends_on date not null,
  status text not null default 'active' check (status in ('active','paused','completed','cancelled')),
  current_block_number smallint not null default 1 check (current_block_number >= 1),
  created_at timestamptz not null default now()
);

-- Non-voice fallback reps keep a free member's plan moving after voice credits run out.
insert into public.drills (name, signal, instructions, duration_minutes, modality, difficulty, two_minute_version, scenario_tags, good_looks_like)
values
('Field point rep','purpose','In one real conversation today, state your point before the background. Log what changed.',2,'field',1,'State the point once and log it.','{general}','The point comes before the explanation.'),
('Listener lens log','perspective','Before one real conversation, write the other person’s likely concern. Afterward, log what you learned.',2,'field',1,'Write the likely concern only.','{general}','The other person’s stake is named without caricature.'),
('Pause field rep','composure','Use one intentional pause before answering a difficult question today. Log what happened.',2,'field',1,'Use one pause and log it.','{conflict}','The pause is held without apology or filler.'),
('Message rewrite','message','Write the point you needed to make today in one sentence, then write the reason beneath it.',2,'text',1,'Write the point only.','{general}','A listener could repeat the point.'),
('Reframe field rep','adaptability','When a conversation shifts today, name the new constraint and give one revised response. Log it.',2,'field',1,'Name the new constraint.','{general}','The response changes while the point remains recognizable.')
on conflict (name) do nothing;

alter table public.training_programs
  add column if not exists plan_id uuid references public.training_plans(id) on delete cascade,
  add column if not exists block_number smallint;

create unique index if not exists training_plans_one_active_member
  on public.training_plans(member_id) where status = 'active';
create unique index if not exists training_programs_plan_block
  on public.training_programs(plan_id, block_number) where plan_id is not null;
create unique index if not exists training_programs_active_plan
  on public.training_programs(plan_id) where status = 'active' and plan_id is not null;
create index if not exists training_plans_member_status_idx
  on public.training_plans(member_id, status);

alter table public.training_plans enable row level security;
revoke all on public.training_plans from anon, authenticated;
grant select on public.training_plans to authenticated;
grant all on public.training_plans to service_role;
drop policy if exists training_plans_owner_read on public.training_plans;
create policy training_plans_owner_read on public.training_plans
  for select to authenticated using (member_id = auth.uid());

-- Existing tables are member-readable; plan writes remain service-role-only.
revoke insert, update, delete on public.training_programs, public.program_days, public.drill_completions from authenticated;
grant all on public.training_programs, public.program_days, public.drill_completions to service_role;

create or replace function public.resume_training_plan(p_plan_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  shift_days integer;
begin
  if not exists (select 1 from public.training_plans where id = p_plan_id and member_id = p_member_id and status = 'paused') then
    raise exception 'plan_not_paused';
  end if;
  select greatest(1, current_date - max(date)) into shift_days
    from public.program_days d join public.training_programs p on p.id = d.program_id
    where p.plan_id = p_plan_id and p.status = 'paused';
  shift_days := coalesce(shift_days, 1);
  -- Move through a temporary disjoint range so the unique(program_id,date)
  -- constraint cannot collide mid-update.
  update public.program_days d set date = d.date + 10000
    from public.training_programs p where p.id = d.program_id and p.plan_id = p_plan_id and p.status = 'paused';
  update public.program_days d set date = d.date - 10000 + shift_days
    from public.training_programs p where p.id = d.program_id and p.plan_id = p_plan_id and p.status = 'paused';
  update public.training_programs set status = 'active' where plan_id = p_plan_id and status = 'paused';
  update public.training_plans set status = 'active', starts_on = starts_on + shift_days, ends_on = ends_on + shift_days where id = p_plan_id and member_id = p_member_id;
end;
$$;
revoke all on function public.resume_training_plan(uuid, uuid) from public, anon, authenticated;
grant execute on function public.resume_training_plan(uuid, uuid) to service_role;

create or replace function public.pause_training_plan(p_plan_id uuid, p_member_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from public.training_plans where id = p_plan_id and member_id = p_member_id and status = 'active') then
    raise exception 'plan_not_active';
  end if;
  update public.training_plans set status = 'paused' where id = p_plan_id and member_id = p_member_id;
  update public.training_programs set status = 'paused' where plan_id = p_plan_id and member_id = p_member_id and status = 'active';
end;
$$;
revoke all on function public.pause_training_plan(uuid, uuid) from public, anon, authenticated;
grant execute on function public.pause_training_plan(uuid, uuid) to service_role;
