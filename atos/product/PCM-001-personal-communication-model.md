# PCM-001 — Personal Communication Model (Interface Contract)

| Field | Value |
|---|---|
| **Document ID** | PCM-001 |
| **Version** | 0.1.0 |
| **Status** | Draft (Product Contract) |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | With CE-001 milestones / Product Proof evidence |
| **Dependencies** | FLA-001, CE-001, RES-012 |
| **Related Documents** | PPS-001, lib/transfer.ts (events/reality) |
| **Approval History** | 2026-07-20 — Interface opened so CE-001 can define transcript → model data flow |
| **Change Log** | 2026-07-20 — v0.1.0 contract only; no full model implementation required before CE-M1 |

> **Authority:** Product contract for how observed communication evidence is stored and consumed. Does **not** amend ATOS Specs. Does **not** redesign Atlas. Competencies remain **engine-visible / user-invisible** per FLA-001.

---

## 1. Purpose

The Personal Communication Model (PCM) is the durable, per-user representation of **observed communication behaviors** that improves future simulations and coaching.

PCM is **not**:

- An identity diagnosis (“anxious person,” “bad communicator”)  
- A vanity personality profile  
- A engagement/score leaderboard  

PCM **is**:

- Evidence-linked behavioral patterns  
- Event-linked readiness signals  
- Invisible competency weights that guide the coaching engine  
- Reality-updated priorities (reality outranks simulation)

---

## 2. Inputs (producers)

| Source | Producer | What enters PCM |
|---|---|---|
| Voice / text turns | CE-001 | Finalized transcripts + turn timestamps + role |
| Forge coaching | `/api/coach` + FLA contract | `doneWell`, `improve`, `whyItMatters`, `evidence`, scores |
| Event | `/prepare` + `ForgeEvent` | Target event context |
| In-Forge reflection | `/reflect` | User-stated strengths / next focus |
| Reality capture | `/reality` | Real-world outcomes; **highest priority updates** |

---

## 3. Core entities (logical schema)

```
UserPCM
  userId
  updatedAt
  competencyWeights[]     // FLA C-* ids; invisible to UI
  patterns[]              // recurring behaviors with evidence refs
  eventLinks[]            // eventId → sessionIds → realityId?
  lastCoachingPriorities[] // max 3 behavioral focuses for next sim
```

### 3.1 Observation (append-only evidence)

| Field | Type | Notes |
|---|---|---|
| observationId | string | |
| userId | string | |
| sessionId | string | |
| eventId | string? | |
| turnIndex | number | |
| source | `transcript` \| `coach` \| `reflection` \| `reality` | |
| role | `user` \| `npc` \| `forge` \| `system` | |
| transcriptExcerpt | string | Required for coach claims |
| behaviorCode | string? | Optional internal tag (e.g. `hedge`, `structure_skip`) |
| competencyIds | string[] | FLA C-* |
| confidence | `observation` \| `pattern` \| `verified` | Align SPEC-003 language |
| createdAt | ISO string | |

### 3.2 Pattern (derived; never invent without ≥2 observations)

| Field | Type | Notes |
|---|---|---|
| patternId | string | |
| userId | string | |
| description | string | Behavioral, not identity |
| evidenceObservationIds | string[] | ≥2 for strong coaching claims |
| competencyIds | string[] | |
| strength | number | 0–1 internal |
| updatedAt | ISO string | |

### 3.3 Next-sim priority (consumed by CE / coach)

| Field | Type | Notes |
|---|---|---|
| priorityId | string | |
| userId | string | |
| behaviorFocus | string | What to practice next |
| why | string | Transfer justification |
| source | `coach` \| `reality` \| `reflection` | Reality wins conflicts |
| eventId | string? | |
| active | boolean | |

---

## 4. Update rules (FLA-binding)

1. **Evidence before claim** — No pattern without observation refs.  
2. **Behaviors, not identities** — Forbidden to store identity labels as Canonical traits.  
3. **Reality outranks simulation** — Reality capture may demote or replace sim-derived priorities.  
4. **Event-scoped when possible** — Prefer priorities tied to the active `ForgeEvent`.  
5. **Privacy** — User owns transcripts/narratives; no employer surveillance packaging in V1.  
6. **Minimal write path** — CE-001 MVP may write Observations + refresh `lastCoachingPriorities` only; full pattern mining can follow.

---

## 5. CE-001 integration contract

CE-001 **must** call (or enqueue) after each finalized user turn:

```
PCM.ingestTurn({
  userId, sessionId, eventId?,
  turnIndex, role: "user",
  transcript: string,
  audioMeta?: { durationMs, interrupted }
})
```

After Forge coaching returns:

```
PCM.ingestCoach({
  userId, sessionId, eventId?,
  turnIndex,
  coaching: ForgeCoaching,  // includes evidence, whyItMatters
  transcriptExcerpt: string // must match user turn
})
```

After reality capture:

```
PCM.applyReality(realityCapture)  // rebuilds next-sim priorities
```

Coach prompts **must** receive:

```
PCM.getCoachContext(userId, eventId?) → {
  activePriorities: NextSimPriority[],
  recentEvidence: Observation[]  // short window
}
```

Competency weights remain invisible in UI.

---

## 6. Storage (MVP recommendation)

| Layer | MVP | Later |
|---|---|---|
| Client | Optional cache | — |
| Supabase | `pcm_observations`, `pcm_priorities` tables | `pcm_patterns` |
| Local | Dev fallback like `lib/transfer.ts` | Migrate |

Do not block CE-M1 voice on full PCM UI. Ship ingest + coach-context read first.

---

## 7. Out of scope (PCM v0.1)

- Public personality reports  
- Cross-user benchmarking  
- Employer dashboards  
- Auto-diagnosis / clinical claims  

| Field | Value |
|---|---|
| **Status** | Draft contract — bind further via Founder when CE-M3+ lands |
