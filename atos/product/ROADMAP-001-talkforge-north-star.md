# ROADMAP-001 — TalkForge North Star Roadmap

| Field | Value |
|---|---|
| **Document ID** | ROADMAP-001 |
| **Version** | 1.0.0 |
| **Status** | Authoritative product direction |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Updated** | 2026-07-30 |

## North Star

If someone uses TalkForge for three years, they should not feel like they are opening an app.

They should feel like they are walking into a room where a trusted mentor says:

> “Welcome back. Last week you had that difficult conversation with your manager. I’ve been thinking about what happened. Ready to build on it?”

TalkForge’s advantage is not the model. It is the **relationship** it builds with each user.

## Guiding Principles (Never Break)

1. **Coach before teacher** — Understand before explaining.
2. **Curiosity before correction** — Ask before advising.
3. **Encourage before critique** — Strengths first.
4. **Adapt before instructing** — Meet the user where they are.
5. **Practice over information** — Every lesson ends in action.
6. **Progress over perfection** — Reward consistency.
7. **Confidence through repetition** — Make practice safe enough to return.
8. **Remember people, not just sessions** — Every conversation builds on the last.

## Phase map

| Phase | Name | Goal |
|---|---|---|
| **1** | Build Trust | Someone finishes one session and immediately wants another |
| **2** | Adaptive Conversation Engine | Reusable pressure / emotion / dynamics behaviors (moat) |
| **3** | Voice First | Phone-call & radio-style practice + live voice metrics |
| **4** | Growth Intelligence | Weekly/monthly life coaching reports + relationship memory |
| **5** | Real World Missions | Before / during / after real conversations |
| **6** | Communication Genome | Discovered personal patterns (hard to copy) |
| **7** | Communication Twin | Coach that understands how *this* person grows |

## Phase 1 — Build Trust (MVP → Beta)

### 1. Persistent Identity

| Capability | Status |
|---|---|
| User accounts | Done (AUTH-001 / TIP) |
| Session history | Done (`practice_sessions` + `session_reports`) |
| Progress dashboard | Done (`/app/progress`) |
| Cloud sync | Done (Supabase + RLS) |
| Remember name | Done |
| Preferred nickname | Shipping (coach_memory + Settings) |
| Communication goals | Shipping (editable memory) |
| Long-term challenges | Shipping (editable memory) |
| Confidence level | Partial → Shipping (updated from sessions + Settings) |
| Learning style | Shipping (editable memory) |

### 2. Human Conversation Engine

| Capability | Status |
|---|---|
| Mentor pacing / ask before teaching | Done (philosophy module) |
| Shorter responses / reduce lecture mode | Done (prompt constraints) |
| Encourage more than correct | Done (wrap + philosophy) |
| Admit uncertainty / humility | Done (prompt constraints) |
| Detect nervous / frustrated / overwhelmed | Partial (heuristics + short-message path) — deepen in Phase 2 |
| Adapt tone / depth / challenge automatically | Partial — deepen in Phase 2 Emotion Engine |

### 3. Permanent Memory

| Capability | Status |
|---|---|
| Last session + previous goals | Done |
| Biggest weakness / strength | Done / Shipping |
| Recurring habits | Done (speaking_habits + adaptive insights) |
| Frequently practiced scenarios | Done |
| Preferred coaching style | Shipping (Settings) |
| Emotional triggers | Shipping (editable memory) |
| Relationships user mentions | Phase 4 |
| Pattern welcome (“Last week you struggled…”) | Shipping |

**Phase 1 exit criteria:** A returning member hears a mentor who remembers a struggle or pattern — not a generic “Welcome back” — and finishes wanting another session.

## Phase 2 — Adaptive Conversation Engine (Moat)

Reusable behaviors, not thousands of scripts:

- **Pressure Engine** — time, executive, audience, negotiation
- **Emotion Engine** — angry, sad, defensive, excited, nervous, passive-aggressive
- **Conversation Dynamics** — interruptions, silence, pushback, curiosity, confusion, disagreement, skepticism, topic changes

## Phase 3 — Voice First

- Phone-call scenarios (recruiter, sales, family, leadership, networking, cold call)
- Radio-style practice (audio-only)
- Live voice metrics: pace, silence, energy, confidence, warmth, fillers, interruptions, speaking/listening ratio

## Phase 4 — Growth Intelligence

- Weekly review + monthly report (“You interrupted 37% less.”)
- Relationship memory (Mom, Boss, Spouse, Recruiter…) with follow-ups across months

## Phase 5 — Real World Missions

Before → during (quick reminders) → after reflection; compare Practice → Reality → Growth.

## Phase 6 — Communication Genome

Discovered patterns (“You avoid conflict with authority.”) learned from history — not hard-coded scripts.

## Phase 7 — The Communication Twin

Forge understands how this specific person thinks, speaks, persuades, learns, handles stress, negotiates, leads, and grows — without pretending to *be* them.

## Current execution focus

**Stay on Phase 1 until trust is felt in the first two sessions.**  
Do not start Phase 2 engines until Phase 1 exit criteria are met in production with real members.
