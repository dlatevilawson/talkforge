# ASSESS-MIGRATE-001 — Assessment slot lifecycle migration

| Field | Value |
|---|---|
| **Document ID** | ASSESS-MIGRATE-001 |
| **Status** | Working Knowledge — execution gate (not Canonical) |
| **Date** | 2026-08-11 |
| **Plane** | Continuation of Living Training Plan assessment migration |
| **Related** | OWN-001 · LP-LAW-001 · Forge Laws #014–#017 · `lib/ce/assessment-lifecycle.ts` |

---

## Invariant (binding)

App owns **slot**, **acceptance**, **completion**, **accepted values**, and **LP write mapping**.  
Forge owns **wording / delivery** only.  
Transcript is **evidence**, never structured truth.

---

## Migration ledger

| Step | Scope | Status |
|---|---|---|
| 1 | Slot primitives | **FROZEN** on `main` |
| 2 | Shadow `acceptAnswer` on `USER_UTTERANCE` | **FROZEN** on `main` |
| 3 | Forge receives `currentSlot` only | **FROZEN** on `main` |
| 4 | Keyword `result`/`covered` no longer authoritative | **FROZEN** on `main` |
| 5 | Completion = required slots filled; caps hard-abort only | **FROZEN** on `main` (#125) |
| 6 | `AssessmentSnapshot` → sessionStorage → results page | **FROZEN** on `main` (#126) |
| 7 | Snapshot → `/api/assessment/complete` → Living Profile | **FROZEN** on `main` (#128) — F1=B · F2=A · F3=A |
| 8 | Delete extractors / keyword client persist / obsolete telemetry | **Done on branch** — cleanup only; Steps 5–7 behavior unchanged |

---

## Step 7 — FROZEN (recap)

Snapshot is LP authority. Pins: **F1=B**, **F2=A**, **F3=A**.  
Do not reopen write mapping without Founder decision.

---

## Step 8 — Cleanup success criteria

**One job:** remove obsolete extract / keyword paths without changing Steps 5–7 behavior.

### In scope

1. Delete transcript extractors from `app/api/assessment/complete/route.ts` (`extractFromTranscript`, heuristics, OpenAI extract call).
2. Remove keyword `AssessmentResult` client dual-write (`persistAssessmentResultClient` / storage key) from VoiceArena and lifecycle helpers.
3. Remove obsolete keyword tagger (`inferAssessmentCategories` / `applyCategories` no-op).
4. Keep snapshot → LP wire, completion, lock, Forge, and `currentSlot` unchanged.

### Out of scope

- Redesigning results or profile UI
- Removing legacy empty `result`/`covered` husks from lifecycle state (harmless; not authority)
- Changing confusion gating classifiers used for acceptAnswer / prompts
- Changing Living Profile schema

### Verification

1. `npm run test:assessment` + `npm run typecheck` green.
2. Complete route has no OpenAI / extractFromTranscript / heuristicExtraction.
3. VoiceArena posts only `assessmentSnapshot` (no `assessmentResult` persist).
4. Slot completion / lock / Forge / `currentSlot` tests still pass.
