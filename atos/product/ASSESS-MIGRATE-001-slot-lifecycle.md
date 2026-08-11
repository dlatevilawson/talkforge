# ASSESS-MIGRATE-001 — Assessment slot lifecycle migration

| Field | Value |
|---|---|
| **Document ID** | ASSESS-MIGRATE-001 |
| **Status** | Working Knowledge — execution gate (not Canonical) |
| **Date** | 2026-08-11 |
| **Plane** | Continuation of Living Training Plan assessment migration (Steps 1–6 on `main`) |
| **Related** | OWN-001 · LP-LAW-001 · Forge Laws #014–#017 · `lib/ce/assessment-lifecycle.ts` |

---

## Invariant (binding for all remaining steps)

App owns **slot**, **acceptance**, **completion**, **accepted values**, and (from Step 7) **LP write mapping**.  
Forge owns **wording / delivery** only.  
Transcript is **evidence**, never structured truth.

Do **not** change completion, response lock, Forge prompts, or `currentSlot` behavior in Steps 7–8.

---

## Migration ledger

| Step | Scope | Status |
|---|---|---|
| 1 | Slot primitives | **FROZEN** on `main` |
| 2 | Shadow `acceptAnswer` on `USER_UTTERANCE` | **FROZEN** on `main` |
| 3 | Forge receives `currentSlot` only | **FROZEN** on `main` |
| 4 | `applyCategories` no-ops `result`/`covered` | **FROZEN** on `main` |
| 5 | Completion = required slots filled; caps hard-abort only | **FROZEN** on `main` (#125) |
| 6 | `AssessmentSnapshot` → sessionStorage → results page | **FROZEN** on `main` (#126) — see below |
| 7 | Snapshot → `/api/assessment/complete` → Living Profile | **CRITERIA LOCKED** — not started |
| 8 | Remove obsolete extractors / cleanup | **LOCKED** — do not begin until Step 7 closed |

---

## Step 6 — FROZEN

### What is frozen

- `AssessmentSnapshot` shape (`version: 1`, accepted answers only, `sufficient`, meta)
- Storage key `talkforge.assessmentSnapshot.v1`
- `buildAssessmentSnapshot` / persist / read helpers
- VoiceArena persist on successful complete + early End
- Results page render from accepted slots + `ASSESSMENT_SLOT_LABELS`

### Verification that closed Step 6

Browser-verified on merged `main` (authenticated member):

1. Completed assessment: accepted answers appear on results.
2. Early-end / incomplete: does **not** fabricate unfilled answers.
3. Refresh / reload still shows the persisted snapshot.

### Reopen rule

Do **not** reopen Step 6 unless a Founder-visible regression hits one of those three checks. Cosmetic results-copy tweaks are allowed; authority / shape / storage-key changes are not.

---

## Step 7 — Success criteria (write before code)

**One job:** wire the **same persisted `AssessmentSnapshot`** into the Living Profile write path.

### A. Authority

| Source | Role after Step 7 |
|---|---|
| `AssessmentSnapshot` (accepted slots) | **Authoritative** structured input for LP assessment write |
| Keyword `life.result` / `AssessmentResult` | Not authority (may remain dual-written client-side until Step 8) |
| Transcript / `extractFromTranscript` / heuristics | **Not** authority for goals/challenges/strengths when a snapshot is present |
| Forge wording | Unchanged — never selects slots or invents LP fields |

### B. Client → API contract

1. On assessment complete **and** early End, VoiceArena posts the **snapshot** (same object already persisted for results) to `POST /api/assessment/complete`.
2. Request still may include `turns` + `practiceSessionId` as **evidence refs only**.
3. Do **not** require keyword `assessmentResult` for LP writes.
4. If snapshot is missing or invalid → treat as **incomplete write** (no transcript-invented goals/challenges). Prefer explicit failure or `profile_source: "incomplete"` over silent extract fallback.

### C. Living Profile write outcomes

| Snapshot state | Required LP outcome |
|---|---|
| `sufficient: true` and required slots filled with accepted answers | `profile_source: "assessment"`; LP fields populated **only** from the explicit mapping in §D; provenance records the assessment write with `memberConfirmed: false` |
| `sufficient: false` / early End / missing required answers | `profile_source: "incomplete"`; **do not** fabricate goals, strengths, challenges, or presence scores |
| Hard-abort / cancel to Coach (no results persist) | No Step 7 LP assessment write from that path |

Optimistic concurrency (`version` check) remains.

### D. Explicit slot → LP mapping (no invention)

Use **existing** Living Profile fields only. No new LP schema columns in Step 7.

| Slot id | LP write |
|---|---|
| `skill_to_improve` | Primary `goals[]` entry (accepted answer text) |
| `six_week_success` | Additional `goals[]` entry **or** `purpose_statement` **only if** current purpose is empty — pick one rule in implementation and test it; do not write both copies of the same string |
| `what_goes_wrong` | `challenges[]` |
| `behavior_to_change` | `challenges[]` |
| `where_it_shows_up` | Append context into the related challenge string **or** a separate `challenges[]` entry — must remain the accepted answer text, not a model paraphrase |
| `recent_missed_conversation` | `challenges[]` (accepted answer text) |
| `practice_time` | Provenance / claim text only — **no** new LP column; do not invent a practice-capacity identity field |

**Hard rules for mapping:**

- Copy **accepted answer strings** (trim only). No LLM rewrite of slot answers into LP fields in Step 7.
- Empty / unfilled slots contribute nothing.
- `strengths[]`: leave unchanged unless an accepted slot is later explicitly mapped (none today) — do **not** invent strengths.
- `presence_scores`: **do not** invent from keywords or transcript in Step 7. Either leave existing scores untouched on successful write, or set `null` on incomplete — choose one and test; no mid-scale fabrication.

### E. Must not change (non-goals)

Step 7 **fails review** if it also changes any of:

- `isAssessmentSlotsComplete` / hard-abort caps / reducer completion
- `responsesLocked` / closing / response-gate behavior
- Forge system/turn/closing prompts or slot injection
- `currentSlot` / `resolveAssessmentTurnSlot` / `markSlotAsAsking` / `acceptAnswer` semantics
- Results page authority (still snapshot-from-slots; Step 6 frozen)
- Removing `extractFromTranscript` / heuristic extractors (that is **Step 8**)
- Training plan generation, missions, readiness redesign, new identity schema

### F. Verification (Step 7 done only when all pass)

1. **Sufficient path:** complete assessment → results show accepted answers → LP reload shows goals/challenges derived from those **same** accepted strings (mapping §D), `profile_source === "assessment"`.
2. **Insufficient path:** early End with partial slots → results incomplete → LP `profile_source === "incomplete"` and **no** fabricated goals/challenges from transcript.
3. **No dual authority:** with a valid snapshot present, disabling or ignoring transcript extract still yields the same LP write.
4. **Regression:** assessment still completes only on required slots; lock / Forge / `currentSlot` behavior unchanged (`npm run test:assessment` green + spot-check).
5. **OWN-001:** assessment LP write remains provenance-tagged session observation, not silent identity invention.

### G. Implementation budget (anti-sprawl)

Touch only what the wire requires, typically:

- `app/components/VoiceArena.tsx` (POST body)
- `app/api/assessment/complete/route.ts` (snapshot authority + mapping)
- Small pure mapper helper (prefer under `lib/ce/` or `lib/system1/`) + tests

Do **not** open profile UI redesign, prompt redesign, or extractor deletion in the same PR.

---

## Step 8 (preview only — locked)

After Step 7 verification: delete / quarantine transcript extract authority, keyword `AssessmentResult` client persist if unused, and obsolete telemetry. Not in scope until Step 7 criteria §F pass.
