-- Day 9 content guarantee: every existing drill has a concrete question and
-- a complete worked example before these fields become mandatory.
alter table public.drills
  add column question text,
  add column worked_example text;

update public.drills as d
set question = v.question,
    worked_example = v.worked_example
from (values
  ('One-sentence point',
   'What is the one thing you want the listener to remember from this conversation?',
   E'Point: I want the team to leave with one clear next step.\nExample: After the meeting, everyone should know who owns the first action and when it starts.'),
  ('So-what ladder',
   'What does your listener stand to gain if your proposal succeeds?',
   E'Round 1: The team saves time because we stop duplicating the same work.\nRound 2: That gives each person more time to serve customers.\nRound 3: Customers get answers sooner, so fewer of them give up and leave.'),
  ('Headline first',
   'What is your conclusion about the project delay, and what is one reason for it?',
   'Conclusion: We should move the launch back one week. The final accessibility check found two issues that could block customers from completing checkout.'),
  ('Steel-man the objection',
   'What is the strongest fair version of the concern that your proposal costs too much?',
   '“The proposal may be worthwhile, but the cost is hard to justify before we know whether it will improve retention.” That is fair. We can test it with one team for a month and review the retention evidence before expanding.'),
  ('Three chairs',
   'What does each of your three stakeholders need most from this launch plan?',
   E'My team needs a schedule they can deliver. The customer needs a reliable release date. Finance needs the cost to stay within budget.\nTo the customer: “We will confirm the date after the final reliability check, so the date we give you is one we can keep.”'),
  ('Question behind the question',
   'When someone asks whether the work will be finished by Friday, what concern might they really have?',
   'They may be worried that a delay will leave their team without time to prepare. I would answer: “The core work will be ready Thursday, and I will send the final checklist by noon so your team has time to review it.”'),
  ('The 3-second rule',
   'What opening line will you say before holding a full three-second pause?',
   'Opening line: “Thanks for making time to talk.” [Hold a full three seconds of silence.] Continue: “I want to make sure we leave with one clear next step.”'),
  ('Interruption drill',
   'What point do you want to finish after someone interrupts you during your update?',
   '“Good—let me land this point. The release is ready for review, and the one remaining decision is which support team will own launch day. Once we name that owner, we can confirm the date.”'),
  ('Slow finish',
   'What final sentence will you use to close your recommendation deliberately?',
   '“I recommend that we begin with one team, review the results together, and expand only if the evidence supports it.” [Deliver the final sentence at half your usual pace.]'),
  ('PREP builder',
   'Why should a founder practice communication every day?',
   E'Point: A founder who practices speaking every day gets heard. One who doesn\'t, doesn\'t.\nReason: Most ideas don\'t fail because they\'re bad. They fail because nobody understood them the first time.\nExample: You walk into a meeting with a good idea but no clear sentence for it. / Someone else says it simply, and the room follows them.\nPoint: That\'s why I practice. So the next time it matters, the words are already there.'),
  ('Cut 30%',
   'How would you explain why the team should test the change before rolling it out?',
   E'90 seconds: “We should test the change with one team first. That lets us find problems while the impact is small, hear what the team needs, and adjust the process before everyone depends on it.”\n60 seconds: “Let’s test the change with one team, fix what we learn, then expand.”'),
  ('Bridge phrases',
   'What can you say to return to your main point after the conversation gets sidetracked?',
   '“What matters here is the customer impact. The key shift is that the delay affects only the optional feature, not the core service. Let me put it directly: the core service remains on schedule.”'),
  ('Topic toss',
   'How can you connect an unexpected word to your point without losing the point?',
   'My point is that we need a clear handoff. Even a relay works only when the next runner knows exactly when to take the baton. In the same way, each task needs a named owner and a clear next step.'),
  ('Hostile question',
   'How would you answer “Why should anyone trust you with this decision?” without becoming defensive?',
   '“The fair question is what evidence supports this decision. We tested the process with two customers, both completed the task without help, and I will share the results and the remaining risks before we expand it.”'),
  ('60-second reframe',
   'How would you explain your proposal to a ten-year-old while keeping its main point?',
   '“We should try the new plan with one small group first. Then we can see what works, fix what does not, and only give it to everyone if it really helps.”'),
  ('Field point rep',
   'In which real conversation today did you state your point before giving background, and what happened next?',
   E'Field note — Conversation: Monday project check-in.\nWhat I said first: “We need one owner for the customer handoff.”\nWhat happened next: The team named an owner before discussing the timeline.'),
  ('Listener lens log',
   'What did you learn about the other person’s concern in your real conversation?',
   E'Field note — Before: I thought my colleague was mainly concerned about the deadline.\nWhat they said: They were worried the support team would be left out.\nWhat I learned: Include support in the handoff review.'),
  ('Pause field rep',
   'What changed after you paused before answering a difficult question today?',
   E'Field note — Question: “Can we promise the date?”\nPause: I took one full breath before answering.\nWhat happened: I checked the dependency instead of agreeing too quickly.'),
  ('Message rewrite',
   'What is the main point you needed to make today, and what reason supports it?',
   E'Point: We need to confirm the owner before announcing the launch date.\nReason: The support team cannot prepare until one person is responsible for the handoff.'),
  ('Reframe field rep',
   'When a real conversation changed direction today, what new constraint did you respond to?',
   E'Field note — New constraint: The customer needed an answer before the review meeting.\nRevised response: I sent the confirmed facts now and promised the remaining detail by 3 PM.\nWhat stayed the same: I did not promise a date we had not verified.')
) as v(name, question, worked_example)
where d.name = v.name;

do $$
declare
  active_count integer;
  missing_count integer;
begin
  select count(*) into active_count from public.drills where is_active;
  select count(*) into missing_count
    from public.drills
    where question is null or btrim(question) = ''
       or worked_example is null or btrim(worked_example) = '';

  if active_count <> 20 then
    raise exception 'Expected 20 active drills for question/example backfill; found %', active_count;
  end if;
  if missing_count <> 0 then
    raise exception 'Question/example backfill is incomplete for % drill rows', missing_count;
  end if;
end;
$$;

alter table public.drills
  alter column question set not null,
  alter column worked_example set not null;
