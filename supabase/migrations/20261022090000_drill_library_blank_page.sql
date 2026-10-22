-- Phase 1A: Drill Library + non-blank practice entry.
-- Member-facing readiness remains disabled; these tables contain practice content only.

create table if not exists public.training_programs (
  id uuid primary key default gen_random_uuid(),
  member_id uuid not null references public.profiles(id) on delete cascade,
  focus_signal text not null check (focus_signal in ('purpose','perspective','composure','message','adaptability')),
  goal_text text not null default '',
  starts_on date not null default current_date,
  ends_on date not null default (current_date + 13),
  status text not null default 'active' check (status in ('active','paused','completed')),
  baseline_summary text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.drills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  signal text not null check (signal in ('purpose','perspective','composure','message','adaptability')),
  instructions text not null,
  duration_minutes smallint not null check (duration_minutes between 2 and 5),
  modality text not null check (modality in ('voice','text','field')),
  difficulty smallint not null check (difficulty between 1 and 3),
  two_minute_version text not null,
  scenario_tags text[] not null default '{}',
  good_looks_like text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.training_programs(id) on delete cascade,
  day_index smallint not null check (day_index between 1 and 14),
  date date not null,
  drill_id uuid not null references public.drills(id),
  field_assignment_text text not null default '',
  status text not null default 'pending' check (status in ('pending','done','skipped')),
  completed_at timestamptz,
  unique(program_id, day_index),
  unique(program_id, date)
);

create table if not exists public.drill_completions (
  id uuid primary key default gen_random_uuid(),
  day_id uuid references public.program_days(id) on delete set null,
  member_id uuid not null references public.profiles(id) on delete cascade,
  drill_id uuid not null references public.drills(id),
  completed_at timestamptz not null default now(),
  practice_session_id text references public.practice_sessions(id) on delete set null,
  self_rating smallint check (self_rating between 1 and 3),
  notes text,
  unique(member_id, drill_id, practice_session_id)
);

alter table public.practice_sessions add column if not exists program_id uuid references public.training_programs(id) on delete set null;
alter table public.practice_sessions add column if not exists purpose text not null default 'free_practice'
  check (purpose in ('diagnostic','drill','check_in','emergency','free_practice'));
alter table public.practice_sessions add column if not exists drill_id uuid references public.drills(id) on delete set null;
alter table public.practice_sessions add column if not exists voice_minutes numeric(8,2);

insert into public.drills (id, name, signal, instructions, duration_minutes, modality, difficulty, two_minute_version, scenario_tags, good_looks_like)
values
('00000000-0000-0000-0000-000000000001','One-sentence point','purpose','Write the single sentence you would want quoted from this conversation. 12 words or fewer. Then read it aloud once, exactly as written.',3,'text',1,'Just write the sentence.','{general}','States the point before any background.'),
('00000000-0000-0000-0000-000000000002','So-what ladder','purpose','The coach will ask “so what?” after each answer, 3 rounds. Each round, connect your answer to what the listener stands to gain or lose. Do not repeat the previous round’s words.',4,'voice',2,'Complete one round.','{general,pitch}','Each round names a concrete stakeholder stake.'),
('00000000-0000-0000-0000-000000000003','Headline first','purpose','Answer 5 prompts with your conclusion inside the first 10 seconds, then give one supporting reason. If you build up to the point, stop and restart.',3,'voice',2,'Answer 3 prompts.','{interview,pitch}','The conclusion lands before the second 10 seconds.'),
('00000000-0000-0000-0000-000000000004','Steel-man the objection','perspective','Before rebutting, state the strongest fair version of the other side’s objection in 30 seconds—strong enough that they would say “yes, that’s my point.” Then rebut it.',4,'voice',2,'Steel-man only; skip the rebuttal.','{conflict,negotiation}','The objection is stated without caricature or sarcasm.'),
('00000000-0000-0000-0000-000000000005','Three chairs','perspective','Write one line for what three stakeholders care about most. Then deliver your point tuned to one of them, naming that stakeholder at the start.',5,'text',3,'Write the three stakeholder lines.','{general,pitch}','The delivery uses the chosen stakeholder’s language and stakes.'),
('00000000-0000-0000-0000-000000000006','Question behind the question','perspective','The coach asks surface questions. Before answering each, say what you think the real concern underneath is, then answer that concern.',3,'voice',2,'Do 2 questions.','{interview,feedback}','Names the underlying concern before answering.'),
('00000000-0000-0000-0000-000000000007','The 3-second rule','composure','Answer 5 coach questions. Wait a full 3 seconds of silence before each answer—count it. Do not fill the silence with “um” or “so.”',4,'voice',1,'Answer 3 questions.','{interview,conflict}','Silence is held without filler; answers start clean.'),
('00000000-0000-0000-0000-000000000008','Interruption drill','composure','Deliver a 90-second take. The coach interrupts twice. Each time: stop, take one breath, say “good—let me land this point,” then continue without rushing.',4,'voice',3,'Practice one interruption.','{conflict,feedback}','Pace does not spike after interruption.'),
('00000000-0000-0000-0000-000000000009','Slow finish','composure','Deliver a 60-second take. The final 15 seconds must be at half your normal pace. Land the last sentence deliberately.',3,'voice',2,'Deliver 30 seconds and slow the final sentence.','{pitch,interview}','The closing sentence is deliberate, not trailed off.'),
('00000000-0000-0000-0000-000000000010','PREP builder','message','Write one answer in PREP form: Point, Reason, Example (two lines), Point. Then say it aloud exactly as written.',4,'text',1,'Write the four PREP parts.','{interview,pitch}','A listener could identify the four parts.'),
('00000000-0000-0000-0000-000000000011','Cut 30%','message','Deliver a 90-second take, then the same content in 60 seconds. Cut filler and throat-clearing, not substance.',4,'voice',2,'Do a 60-second take, then a 45-second take.','{pitch,interview}','The shorter take keeps all key points.'),
('00000000-0000-0000-0000-000000000012','Bridge phrases','message','Rehearse “What matters here is…”, “The key shift is…”, and “Let me put it directly…”. Then recover from two coach derails using a bridge phrase.',3,'voice',2,'Rehearse each phrase aloud three times.','{feedback,conflict}','Recovery is immediate without rambling.'),
('00000000-0000-0000-0000-000000000013','Topic toss','adaptability','Deliver your take. Midway, the coach drops an unrelated word. Weave it into your point within 20 seconds without derailing. Do two tosses.',4,'voice',2,'Do one toss.','{improv,pitch}','The weave is smooth and the point survives.'),
('00000000-0000-0000-0000-000000000014','Hostile question','adaptability','The coach asks a loaded question. First reframe it neutrally aloud as “The fair question is…”, then answer without defensiveness.',4,'voice',3,'Reframe one question only.','{interview,conflict}','The reframe is neutral and addresses substance.'),
('00000000-0000-0000-0000-000000000015','60-second reframe','adaptability','Deliver your point. The coach adds a surprise constraint, such as explaining it to a child or using 20 seconds. Re-deliver immediately under that constraint.',3,'voice',2,'Apply one constraint.','{pitch,interview}','The point stays recognizable under the constraint.')
on conflict (name) do update set instructions=excluded.instructions, duration_minutes=excluded.duration_minutes, modality=excluded.modality, difficulty=excluded.difficulty, two_minute_version=excluded.two_minute_version, scenario_tags=excluded.scenario_tags, good_looks_like=excluded.good_looks_like, is_active=true;

alter table public.training_programs enable row level security;
alter table public.program_days enable row level security;
alter table public.drills enable row level security;
alter table public.drill_completions enable row level security;
revoke all on public.training_programs, public.program_days, public.drill_completions from anon, authenticated;
grant select on public.training_programs, public.program_days, public.drill_completions, public.drills to authenticated;
grant all on public.training_programs, public.program_days, public.drill_completions to service_role;
drop policy if exists training_programs_owner_read on public.training_programs;
drop policy if exists program_days_owner_read on public.program_days;
drop policy if exists drill_completions_owner_read on public.drill_completions;
drop policy if exists drills_active_read on public.drills;
create policy training_programs_owner_read on public.training_programs for select to authenticated using (member_id = auth.uid());
create policy program_days_owner_read on public.program_days for select to authenticated using (exists (select 1 from public.training_programs p where p.id = program_days.program_id and p.member_id = auth.uid()));
create policy drill_completions_owner_read on public.drill_completions for select to authenticated using (member_id = auth.uid());
create policy drills_active_read on public.drills for select to authenticated using (is_active = true);
create index if not exists training_programs_member_status_idx on public.training_programs(member_id, status);
create index if not exists program_days_program_date_idx on public.program_days(program_id, date);
create index if not exists drill_completions_member_completed_idx on public.drill_completions(member_id, completed_at desc);

