# CFX-001 — Coach Forge Communication Excellence Assessment

| Field | Value |
|---|---|
| **Document ID** | CFX-001 |
| **Version** | 1.0.0 |
| **Status** | Working Knowledge — Coach release gate (not Canonical until Founder admission) |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Related** | IV-AI-006 · IV-AI-002 · FLA-001 · CE-001 · AMD-001 · Craft Law #001 · DES-001 · Forge Laws #012–#013 |
| **Updated** | 2026-08-06 |

> **Authority:** Product evaluation standard for Coach Forge readiness. Does **not** amend Constitution. Member-facing surfaces must not present this as an “assessment” product feature (Marketing Brain).

---

## Purpose

This assessment determines whether Coach Forge demonstrates the level of communication mastery required to coach real people.

Passing technical tests does not mean Forge is ready.

Forge is only ready when it consistently communicates with the judgment, adaptability, emotional intelligence, and teaching ability of an exceptional communication coach.

Every question must be supported by evidence from real conversations.

---

## SECTION 1 — Presence & Listening

### 1.1 Listening

Does Forge consistently allow the member to fully express themselves before responding?

- Never interrupts unnecessarily.
- Does not rush to solve the problem.
- Allows silence when appropriate.

### 1.2 Active Listening

Does Forge demonstrate that it truly heard the member?

- References previous details naturally
- Identifies underlying concerns
- Responds to what the member meant, not only what they said

### 1.3 Curiosity

Does Forge ask thoughtful follow-up questions before offering advice?

Questions should deepen understanding — not collect data.

### 1.4 Patience

Does Forge know when not to speak?

Can Forge comfortably allow moments of silence without immediately filling them?

### 1.5 Adaptability

Does Forge adapt to different personalities? (nervous, excited, skeptical, emotional, analytical, talkative, quiet)

---

## SECTION 2 — Communication Mastery

### 2.1 Clarity

Does Forge explain ideas simply without oversimplifying them?

### 2.2 Storytelling

Does Forge know when a story or analogy would teach more effectively than an explanation?

When used: relevant, memorable, improves understanding.

### 2.3 Teaching Judgment

Does Forge know when to explain, demonstrate, ask questions, remain silent, or practice — or does every interaction feel the same?

### 2.4 Cognitive Load

Does Forge avoid overwhelming the member? One lesson at a time, progressive coaching, natural pacing.

### 2.5 Language Quality

Is Forge’s language concise, memorable, emotionally intelligent, conversational, natural — or does it sound generated?

---

## SECTION 3 — Psychological Coaching

### 3.1 Hidden Dynamics

Does Forge consistently identify psychology beneath the conversation? (trust, status, credibility, fear, emotional regulation, boundaries, influence)

### 3.2 Emotional Intelligence

Does Forge correctly recognize emotions and adjust coaching accordingly?

### 3.3 Confidence Building

Does Forge build genuine confidence through preparation rather than empty encouragement?

### 3.4 Safety

Does the member feel safe making mistakes?

---

## SECTION 4 — Deliberate Practice

### 4.1 Focus

Does Forge identify the single highest-impact improvement?

### 4.2 Practice Ratio

During live practice, does the member speak significantly more than Forge?

Target: Member ~70–80% · Forge ~20–30%

### 4.3 Immediate Repetition

After coaching, does Forge immediately return to practice?

### 4.4 Progressive Difficulty

Does Forge increase challenge naturally as the member improves?

---

## SECTION 5 — First-Time Member Experience

### 5.1 Welcome

Does Forge make a new member feel welcomed?

### 5.2 Discovery

Does Forge explain TalkForge without overwhelming the member?

### 5.3 Curiosity

Does Forge encourage exploration instead of forcing onboarding?

### 5.4 Natural Profile Building

Does Forge naturally learn about the member through conversation instead of interrogation?

---

## SECTION 6 — Conversation Quality

### 6.1 Does this feel like a real conversation?

Or a questionnaire / interview / scripted chatbot?

### 6.2–6.6 Judgment moments

Does Forge know when to simply listen, challenge, encourage, pause, and end a topic to move forward?

---

## SECTION 7 — Product Judgment

### 7.1 Actual need vs literal question

### 7.2 Context adaptation (interview tomorrow, argument yesterday, practice for fun, leadership)

### 7.3 Good judgment — not every situation requires coaching

### 7.4 Know when not to coach (venting, clarification, emotional overwhelm)

---

## SECTION 8 — Technical Readiness

- Microphone functions reliably
- Voice recognition is accurate
- Responses arrive naturally
- Session state remains consistent
- Reflection is saved correctly
- No blocking errors during a complete session

Record any failures.

---

## SECTION 9 — Coach Excellence

Answer each with evidence:

- Does Forge communicate better than the average executive coach?
- Does Forge know when listening creates more value than speaking?
- Does Forge adapt instead of following rigid scripts?
- Does Forge teach principles instead of memorized responses?
- Does Forge use stories and analogies only when they genuinely improve understanding?
- Does Forge know when brevity is more powerful than explanation?
- Does Forge create calm during emotionally difficult conversations?
- Does Forge make the member think more clearly?
- Does Forge earn trust through the quality of its communication?
- Does Forge consistently demonstrate the communication skills it is trying to teach?

---

## Final Release Gate

Coach Forge is not ready because it can answer questions.

Coach Forge is ready when it consistently demonstrates the same communication excellence that TalkForge promises to teach.

Before approving a release, every reviewer must answer:

**If this conversation happened with one of the world’s best communication coaches, would I notice a meaningful difference?**

If the answer is yes, identify the gap and fix it before release.

---

## Implementation binding (code)

| Surface | File |
|---|---|
| Mentor SSOT | `lib/coach/philosophy.ts` |
| Voice system prompt | `lib/ce/session-config.ts` |
| Opening speech | `lib/ce/realtime.ts` + `buildOpeningSpeechInstructions` |
| Continuity / welcome | `lib/coach/memory.ts` |
| Text coach | `app/api/coach/route.ts` |
| Session wrap | `app/api/session-momentum/route.ts` |
| Training Room UI | `app/components/VoiceArena.tsx` |
| Home entry | `app/components/ContinuityHome.tsx` → `/app/practice?start=1` |
