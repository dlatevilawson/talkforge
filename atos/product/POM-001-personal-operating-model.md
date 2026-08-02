# POM-001 — Personal Operating Model

| Field | Value |
|---|---|
| **Document ID** | POM-001 |
| **Version** | 1.0.0 |
| **Status** | **Authoritative — Founding architecture** |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Updated** | 2026-07-31 |
| **Binding laws** | Forge Laws #012–#017 · LP-LAW-001 · Constitution Articles IX–XII |
| **Related** | PCM-001 (communication evidence substrate), FLA-001, ROADMAP-001 |

---

## Founding sentence

> **TalkForge does not store information so it can remember the past. It organizes information so it can coach the future.**

Every engineering decision must pass this test. If a feature accumulates facts without improving who the member is becoming, it does not ship.

---

## What we are building

Not analytics.
Not a chat log with a better memory.
Not a dashboard that owns its own truth.

**Continuity.**

| Analytics answer | Continuity answers |
|---|---|
| How did I perform? | Who am I becoming? |

The market name for Generation-4 coaching:

> An AI that remembers the person you’re trying to become — and helps you practice becoming that person.

**Personal Operating Model (POM)** is the architecture name.  
**Living Profile** is the member-facing synthesized view of that model.  
Same nervous system. Two audiences.

---

## Relationship to PCM-001

| Document | Owns |
|---|---|
| **PCM-001** | Observed communication behaviors, competencies, session-linked evidence (how they communicate) |
| **POM-001** | Who they are becoming — identity, purpose, principles, seasons, conversation lifecycle, coaching relationship (why practice matters) |

PCM feeds Understanding. POM synthesizes Identity. Experiences read both — they never write identity.

---

## Four layers (frozen responsibilities)

### Layer 1 — Reality (Raw Memory)

What happened. Never lies. Append-oriented.

- Conversations / transcripts / voice
- Reflections
- Scores & session reports
- User-declared goals, milestones, principles
- User answers & confirmations
- Calendar-relevant dates (when declared)

**Writers:** the member · session systems · capture surfaces  
**Readers:** Understanding only (and audits)

### Layer 2 — Understanding (Intelligence Engine)

Discovers — does not invent biography.

Engines (logical; may share implementation):

- Pattern Detection
- Readiness Engine
- Growth Engine
- Memory Engine
- Identity Engine
- Recommendation Engine

**Mandatory rules on every derived output:**

| Rule | Meaning |
|---|---|
| Provenance | How do we know this? (`user_declared` · `forge_inferred` · `confirmed`) |
| Evidence | Observation chain required — no claim without citations |
| Confidence | Numeric or qualitative confidence attached |
| Confirmation lifecycle | `inferred → proposed → confirmed → dismissed` |

**Chain of truth (Forge Law #014):**

```
Conversation → Observation → Evidence → Pattern → Insight → Coaching
```

Example — wrong:

> “You struggle with boundaries.”

Example — right:

> “Across your last 11 negotiation sessions, you apologized before saying ‘no’ in 8 of them.”  
> → “Because of that pattern, I’d like to practice boundaries today.”  
> → User can tap and see the evidence pack.

### Layer 3 — Identity (Living Profile)

Synthesized, continually updated representation of the person — **not** every transcript.

Contains:

| Domain | Contents |
|---|---|
| Identity | Name, who they are |
| Purpose | Who they’re becoming · north star · vision |
| Personal Principles | Operating principles (not goals) |
| Current Season | Primary + optional Secondary |
| Patterns | Evidence-backed · confirmation-gated |
| Strengths / Growth areas | Communication-focused |
| Conversation lifecycle | Avoided → Preparing → Scheduled → Completed → Reflection → Archived |
| Typed milestones | Interview, Anniversary, Presentation, … with preparation windows |
| Coaching preferences | Style · learning style · **Coaching Intensity** |
| Growth history (summary) | Trajectories, not raw rows |

**Writers (only two):**

1. The member (declared fields)
2. The Intelligence Engine (derived fields — evidence + confirmation rules)

**LP-LAW-001:** No feature may introduce identity fields outside the Living Profile without an explicit Founder decision.

### Layer 4 — Experiences

Everything the member sees. They **ask**; they do not own truth.

- Dashboard
- Coach Forge
- Timeline
- Life Compass
- Progress / Reports
- Readiness surfaces
- Today’s Insight / Home

**Rule (Forge Law #016):** Experiences never write identity.  
Nothing below Living Profile writes back upward.

```
Reality
   ↓
Understanding
   ↓
Living Profile
   ↓
Dashboard · Coach · Timeline · Compass · Reports
```

The Dashboard never decides who you are.  
The Timeline never decides who you are.  
The Coach never decides who you are.  
They only consume.

---

## Personal Principles (not goals)

Goals expire. Principles operate.

Examples:

- I tell the truth even when it’s uncomfortable.
- I protect time with my family.
- I finish what I start.
- I don’t avoid difficult conversations.

Cap: 3–7 statements. Weight, not KPI rank.

Six months later, Forge may say:

> “One of your personal principles is ‘I don’t avoid difficult conversations.’ Do you think this situation is testing that principle?”

Forge did not invent a value. Forge reminded them of their own.  
(Forge Law #015 — remember what matters; never decide what should matter.)

---

## Coaching Intensity

Not a yes/no “may I challenge you?” — a relationship choice:

| Mode | Feel |
|---|---|
| Gentle | Encouragement first; rare challenge |
| Balanced | Default — challenge with permission |
| Challenging | Accountability to their principles |
| Founder Mode | Highest honesty; still never shame |

Challenge is always against **their** principles and evidence — never Forge’s preferences.

---

## Conversation lifecycle (one object)

```
Avoided → Preparing → Scheduled → Completed → Reflection → Archived
```

Nothing disappears. State changes.  
That enables:

> “Six months ago you were terrified to ask for this promotion.”

Avoided and Active are not two schemas — one Conversation with stages.

---

## Seasons

- **Primary Season** (required when set) — e.g. Building TalkForge  
- **Secondary Season** (optional) — e.g. Preparing for fatherhood  

Each has `since` (and optional end/shift signal).  
Season influences priorities, reminders, milestones, and which muscles to train — without freezing the person in a static profile.

---

## Typed milestones (first-class)

Not free-form strings. Objects with:

- Type (Anniversary · Interview · Performance Review · Wedding · Presentation · Graduation · Medical · Family trip · Birthday · Product launch · Court date · …)
- Date
- Importance
- Preparation window
- Reminder style
- Status

Forge knows **when** they become relevant — relationship, not a calendar product.

---

## Evidence packs (product identity)

Every insight the member can see must be tappable into evidence:

- Observed in N of last M scenarios  
- Metrics / deltas that justify the claim  
- Session references  

Trust is not “believe the AI.” Trust is “see why.”

---

## System 1 freeze

System 1 (Identity foundation) freezes when the Living Profile can hold:

- [x] Identity (name, goals, vision) — shipping substrate
- [x] Coaching / learning style — shipping substrate
- [x] Strengths / growth areas — shipping substrate
- [ ] Personal Principles
- [ ] Coaching Intensity
- [ ] Primary + Secondary Season
- [ ] Typed milestones
- [ ] Conversation lifecycle (Avoided→Archived)
- [ ] Provenance + evidence + confirmation on derived fields
- [ ] One unified Living Profile experience (viewers only elsewhere)

After freeze: **new capabilities consume the Living Profile; they do not expand it** without Founder decision (LP-LAW-001).

---

## Body metaphor (normative)

- Brain stores memories → Reality + Understanding + Living Profile  
- Eyes / ears / mouth do not store memories → Experiences  

One nervous system.
