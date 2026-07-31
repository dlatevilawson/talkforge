# AUDIT-001 — Coach Philosophy Review (8-hour arc)

| Field | Value |
|---|---|
| **Document ID** | AUDIT-001 |
| **Date** | 2026-07-31 |
| **Scope** | Founder direction + PRs #47–#51 (mentor pacing → living profile → purpose → Gen-4) |
| **Branch** | `cursor/philosophy-audit-98b4` |

## Verdict

We moved from shipping features into defining a **Generation-4 coaching philosophy**. The substrate (continuity, living profile, purpose) is real — but parallel PRs diverged and would have collided on merge. This branch unifies them and records what still needs work.

## What compounded (keep)

| Layer | Outcome |
|---|---|
| Mentor pacing | Curiosity before lectures; conversation breathes |
| Continuity (Law #012) | Welcome back with memory, not blank menus |
| Emotional calibration (Law #013) | Understood > evaluated |
| Living profile (#50) | Patterns, emotional notes, lasting insight, maturity |
| Purpose Alignment (#51) | Life Compass, drift asks, commitments, milestones |
| Gen-4 + Law #015 | Accountable to *their* values; Timeline designed |

## Repetitions / overlaps (resolved or noted)

| Issue | Detail | Resolution |
|---|---|---|
| Dual Decision **044** | Living profile PR and Purpose PR both claimed 044 | Renumbered: 044 living · 045 purpose · 046 Gen-4/Timeline/unify |
| North-star promise fork | “who you’re becoming” vs “…and stay on that path” | Canonical = expanded promise (ROADMAP 1.4) |
| `longTermGoal` vs `northStar` | Two fields for similar intent | Keep both columns; UI treats `northStar` as canonical; living profile falls back `longTermGoal \|\| northStar` |
| Progress surfaces | Living profile + Life Compass both “who you are” | Both ship; Compass = declared path; Living = learned patterns |
| Phase numbering vs execution | Phase 8/9 named while focus is still 1→1.5 | Intentional: doctrine ahead of engines; execution focus unchanged |

## Bugs / merge hazards found

| Severity | Issue | Status |
|---|---|---|
| **P0** | Merging #50 then #51 conflicts: `types`, `memory`, `memory-server`, `storage`, `schema`, Progress, ROADMAP, decisions | **Fixed** on this branch |
| **P1** | `touchPurposeFollowUpsForUser` could mark vision check asked even when opening used a different purpose overlay | **Fixed** — only touch what the welcome actually selected |
| **P1** | Ops: two migrations required (`living_coach_profile` + `purpose_alignment`) — order either way (additive columns) | Documented |
| **P2** | Settings form is long (coaching memory + full Life Compass) — risk of overwhelm | Needs UX pass (collapse / progressive disclosure) |
| **P2** | Drift theme buckets are keyword-heuristic — can false-positive | Needs real-session tuning; never invent |
| **P2** | Commitment extraction regex is English-only and brittle | Improve with wrap-model structured field later |
| **P2** | Values accountability (Law #015) is prompt doctrine only — no structured “declared values” field yet | Next: values list on Compass + challenge permission flag |
| **P3** | Forge Timeline (Phase 9) designed, not built | Depends on milestones + insights + consent model |

## Needs work (next engineering)

1. **Merge path:** Prefer this unified branch (or merge #50 → #51 → this) — do not land #50 and #51 independently without conflict resolution.
2. **Run both migrations** on production before relying on new columns.
3. **Values field** — let users declare 3–5 values; Law #015 challenges against those.
4. **Settings IA** — progressive Life Compass section; don’t dump every field at once.
5. **Timeline v0** — year-grouped view of milestones + lasting insights (read-only), no invented biography.
6. **Close Phase 1.5 gaps** — “conversations they avoid” + “don’t repeat known info” still open.

## Binding filter still holds

> Forge should leave users feeling more understood than evaluated.

Gen-4 does not override that. Accountability without understanding is lecture — and lecture loses.
