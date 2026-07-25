# Forge Learning Architecture v1.0

| Field | Value |
|---|---|
| **Document ID** | FLA-001 |
| **Version** | 1.0.0 |
| **Status** | Authoritative (Product Canonical) |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | On Founder amendment / Product Proof evidence |
| **Dependencies** | SPEC-002, atlas/constitution.md, atlas/philosophy.md, atlas/founder-brief.md, RES-012 |
| **Related Documents** | STRAT-001, PPS-001, atlas/forge-laws.md |
| **Approval History** | 2026-07-20 — Founder ratified via RES-012 (STRAT-001 Accepted with Amendments) |
| **Change Log** | 2026-07-20 — v1.0.0 governs coaching, learning, reality capture, competencies, product evaluation |

> **Authority:** Product Canonical for coaching agents, simulations, and TalkForge product design. Does **not** amend ATOS constitutional Specs. Conflicts with Identity (mission/trust) escalate to Founder. Loader freeze unchanged — include in Ask Atlas load set only via future Founder-gated compatibility work.

---

## 1. Purpose

Forge Learning Architecture defines how TalkForge turns deliberate practice into **real-world communication performance**.

It governs:

- Coaching philosophy (operationalized)
- Learning architecture
- Reality capture
- Communication modeling
- Competency development
- Product evaluation standards
- Mastery-aligned progress mechanics (redesigned gamification)

Every coaching agent, scenario, reflection flow, and progress surface must conform to this document.

---

## 2. Standing mission context

**Long-term mission:** Help people master life’s most important conversations.

**V1 wedge (not the long-term market):** High-agency technical professionals preparing for **high-stakes technical interviews**.

Entry point is measurable, high-frequency, and high-consequence. Expansion beyond the wedge requires evidence — not ambition alone.

**North Star:** Transfer — improved performance in real-world conversations — not time spent inside Forge.

---

## 3. Product doctrines (Founder-ratified)

### 3.1 Forge is a Performance Laboratory

We do not remove fear.

We prepare people to **perform despite fear** through deliberate practice.

Confidence is a **byproduct of capability**, not a substitute for it.

### 3.2 Events Are the Interface

Users arrive because something important is happening tomorrow.

Forge always begins with the **event** (e.g., “onsite system-design interview Thursday”).

**Competencies remain invisible to the user** while guiding the coaching engine underneath.

### 3.3 Coaching Must Be Evidence-Based

Forge never diagnoses from assumptions.

Every coaching recommendation must emerge from **observed behavior** and **recurring patterns**.

The system coaches **behaviors — not identities**.

Forbidden: labeling the user (“you are anxious / bad at X”) without behavioral evidence from the session or reality capture.

### 3.4 Reality Completes the Learning Loop

Every meaningful conversation should be followed by **structured reflection**.

Reality updates future simulations.

**Reality always outranks simulation.**

### 3.5 Utility Before Transformation

Forge earns trust by solving **today’s urgent problem**.

Only then does it guide the user toward long-term mastery.

Transformation is built on **repeated tactical victories**.

---

## 4. Learning loop (canonical)

```
Event → Prepare (simulate) → Coach (evidence-based) → Reflect (in-Forge)
     → Real conversation → Reality capture → Update model → Next simulation
```

| Stage | Purpose | Success signal |
|---|---|---|
| Event | Orient on stakes, role, deadline | User names a real upcoming conversation |
| Prepare | Deliberate practice against that event | Scenario fidelity to the event |
| Coach | Behavioral feedback from observed turns | Specific, actionable, evidence-cited |
| Reflect (Forge) | Encode what changed in the user’s approach | User can state one improvement to try |
| Reality | Perform in the real conversation | User attempts the conversation |
| Reality capture | Structured debrief of what happened | Evidence updates coaching priorities |
| Update | Adjust future sims & competency weights | Next session harder/more precise |

A session that never connects to a real event is incomplete relative to the North Star.

---

## 5. Coaching contract (binding on agents)

Every coaching response must include, grounded in **observed turns**:

1. **What the user did well** (cite behavior)  
2. **What can improve** (cite behavior)  
3. **Why it matters** for the target event  
4. **A practical example / rewrite**  
5. **Encouragement to try again** (capability, not flattery)

### Evidence rules

| Allowed | Forbidden |
|---|---|
| “In turn 3 you jumped to solution before clarifying constraints.” | “You’re not a systems thinker.” |
| “You used three filler hedges when stating tradeoffs.” | “You lack confidence.” (identity) |
| Pattern across ≥2 turns before strong claim | Single-turn absolute diagnosis |
| Uncertainty labels when evidence thin | Invented psychological profiles |

AI coaches; it does not think *for* the user (Constitution Article II).

---

## 6. Communication modeling

### 6.1 Event model (user-visible)

Minimum fields for V1 wedge:

| Field | Example |
|---|---|
| Event type | Technical interview — system design |
| Stakes | Offer / team bar / leveling |
| When | Timestamp or relative (“in 48 hours”) |
| Audience | Interviewer panel, level, company context (user-provided) |
| Success criteria (user words) | “Clear tradeoffs; structured approach; calm under probe” |

### 6.2 Competency model (engine-visible, user-invisible)

Competencies guide coaching; they are **not** the primary UI.

V1 technical-interview competency set (initial; revise with Product Proof evidence):

| ID | Competency | Observable behaviors |
|---|---|---|
| C-STRUCT | Structured problem framing | Clarifies goals/constraints before solving |
| C-TRADE | Tradeoff articulation | Names alternatives + costs |
| C-PROBE | Probe resilience | Stays organized when interrupted |
| C-COMM | Clarity & pacing | Short, checkable statements; invites confirmation |
| C-DEPTH | Technical depth on demand | Goes deeper when asked without losing thread |
| C-PRES | Composure under pressure | Recovers after stumble; continues |

Scores and labels for competencies are **internal**. Users see event readiness and behavioral coaching.

---

## 7. Reality capture

After a real conversation (or attempt), Forge collects structured evidence:

1. Did the conversation happen? (yes / partial / postponed — with reason)  
2. What went better than practice?  
3. What broke under real pressure?  
4. One moment to replay in the next simulation  
5. Outcome signal (optional, honest): advanced / rejected / unclear / N/A  

Reality capture **outranks** simulation scores when they conflict.

Privacy: user owns reality narratives; never used for manipulative engagement.

---

## 8. Mastery mechanics (gamification redesign)

Forge is **not** an engagement platform.

Progress mechanics may exist only if each mechanic answers:

> **Does this improve real-world performance?**

| Allowed direction | Disallowed direction |
|---|---|
| Mastery marks tied to demonstrated behaviors | XP for time-on-site / login streaks as primary |
| Event readiness indicators | Dopamine loops unrelated to transfer |
| Deliberate-practice streaks (sessions that include coach+reflect toward an event) | Punitive streak loss dark patterns |
| Evidence of reality capture completion | Vanity leaderboards that reward volume over quality |

If a mechanic cannot justify transfer, it does not ship.

---

## 9. Product evaluation standards

A feature, agent, or scenario is **fit to ship** only if:

1. It strengthens preparation for a **real event** (utility).  
2. Coaching claims are **evidence-based** from observed behavior.  
3. It increases probability of **better outside performance** (North Star).  
4. It respects trust (Constitution Art. VI) — no addictive design.  
5. It remains simple enough to explain (Art. IV).  
6. For V1: it serves the **technical interview wedge** or clearly shared infrastructure for that wedge.

### Anti-goals

- Diagnosing identity  
- Optimizing session length or DAU as success  
- Expanding missions/markets before wedge proof  
- Atlas organizational expansion as product work  

---

## 10. V1 wedge application

| Element | V1 binding |
|---|---|
| Primary event class | High-stakes technical interviews |
| Primary user | High-agency technical professionals |
| Primary loop proof | Prepare → coach → real interview → reality capture → improved next prep |
| Other missions (leadership, etc.) | Maintained only if they do not divert capacity from wedge proof; not the spear |

---

## 11. Conformance

| Consumer | Obligation |
|---|---|
| Coaching agents | Coaching contract + evidence rules |
| Scenario / simulation design | Event-first; competency-guided invisibly |
| Progress / mastery UI | Transfer-justified mechanics only |
| Product Proof Sprint 001 | Demonstrate measurable prep improvement + reality-informed coaching |
| Atlas counsel | Evaluate roadmap against this architecture; do not invent Canonical deviations |

Amendments require Founder approval. Atlas may recommend; Atlas may not silently reinterpret.

---

## 12. Relationship to Identity

FLA-001 **implements** Identity for product learning. It does not replace:

- Constitution  
- Founder Brief  
- Forge Laws  
- Philosophy  

If FLA ever conflicts with Identity, **Identity wins** until Founder resolves.

| Field | Value |
|---|---|
| **Status Upon Signature** | Authoritative (Product Canonical) |
