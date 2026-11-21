-- Deliberate-practice phases are ordering metadata, not a completion gate.
-- NULL remains valid for drills whose phase has not been assigned.
alter table public.drills
  add column phase text check (phase in ('recognise', 'build', 'rehearse', 'roleplay'));

update public.drills
set phase = case name
  when 'One-sentence point' then 'build'
  when 'So-what ladder' then 'rehearse'
  when 'Headline first' then 'rehearse'
  when 'Steel-man the objection' then 'roleplay'
  when 'Three chairs' then 'recognise'
  when 'Question behind the question' then 'recognise'
  when 'The 3-second rule' then 'rehearse'
  when 'Interruption drill' then 'roleplay'
  when 'Slow finish' then 'rehearse'
  when 'PREP builder' then 'build'
  when 'Cut 30%' then 'build'
  when 'Bridge phrases' then 'rehearse'
  when 'Topic toss' then 'rehearse'
  when 'Hostile question' then 'roleplay'
  when '60-second reframe' then 'rehearse'
  when 'Field point rep' then 'rehearse'
  when 'Listener lens log' then 'recognise'
  when 'Pause field rep' then 'rehearse'
  when 'Message rewrite' then 'build'
  when 'Reframe field rep' then 'rehearse'
  else phase
end
where name in (
  'One-sentence point', 'So-what ladder', 'Headline first', 'Steel-man the objection',
  'Three chairs', 'Question behind the question', 'The 3-second rule', 'Interruption drill',
  'Slow finish', 'PREP builder', 'Cut 30%', 'Bridge phrases', 'Topic toss',
  'Hostile question', '60-second reframe', 'Field point rep', 'Listener lens log',
  'Pause field rep', 'Message rewrite', 'Reframe field rep'
);
