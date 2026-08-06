# MASTER-ROADMAP-001 — Master Roadmap

| Field | Value |
|---|---|
| **Document ID** | MASTER-ROADMAP-001 |
| **Version** | 1.0.0 |
| **Status** | **Complete — EXEC-001 Step 12** |
| **Updated** | 2026-08-02 |
| **Depends on** | DEP-MAP-001 · PRIORITY-001 · CAT-001 · VERIFY-001 · CONST-001 · Idea Vault |
| **Related** | ROADMAP-001 (north star narrative) |

---

## Purpose

Translate priorities into implementation phases with goal, dependencies, complexity, owner, status.

---

## Phase A — System 1 Foundation (EXEC Step 13)

| Item | Goal | Dependencies | Complexity | Owner | Status |
|---|---|---|---|---|---|
| A1 Living Profile SSOT | One identity store for becoming | LP-LAW · POM | High | Eng / Atlas | Types in `lib/system1/`; persistence/UI pending |
| A2 Provenance / Evidence | Every claim explainable | Law #014 | High | Eng | Types + write guard in `lib/system1/`; DB pending |
| A3 Understanding layer | Patterns → confirmed insights | A2 | High | Eng / Atlas | Partial coach memory |
| A4 Conversation lifecycle | Avoided→…→Archived objects | A1 | Medium | Eng | Types in `lib/system1/`; persistence pending |
| A5 Reflection hooks | Post-practice reflection path | Sessions | Medium | Eng | Partial |
| A6 Unified LP UI | One profile surface | A1 | Medium | Eng | Split surfaces today |

## Phase B — System 2 Experience (EXEC Step 14)

| Item | Goal | Dependencies | Complexity | Owner | Status |
|---|---|---|---|---|---|
| B1 Readiness Engine | Stable What | Phase A | High | Eng / Atlas | Not started |
| B2 Pedagogy Engine | Varied How | B1 | High | Eng / Atlas | Doctrine only |
| B3 Recommendation Engine | One mission packet | B1·B2 | High | Eng / Atlas | Not started |
| B4 Adaptive Homepage | One mission above fold | B3 | Medium | Eng | Not started |
| B5 Personalization / style | Style + intensity | A1·B2 | Medium | Eng | Partial coaching style fields |

## Phase C — Conversation Engine (EXEC Step 15)

| Item | Goal | Dependencies | Complexity | Owner | Status |
|---|---|---|---|---|---|
| C1 CE reliability | Pause/resume, interruptions | CE-M2 | High | Eng | In progress |
| C2 Practice simulations | Structured practice loops | C1·A4 | High | Eng | Partial sessions |
| C3 Persona system | Parked until C2 stable | C2 | High | Eng | Future |
| C4 Scoring after reflection | Score after understand | B path · IV-FEAT-007 | Medium | Eng | Partial |
| C5 Conversation memory | Continuity in practice | A3 · Law #012 | High | Eng | Partial |

## Phase D — UX (EXEC Step 16)

| Item | Goal | Dependencies | Complexity | Owner | Status |
|---|---|---|---|---|---|
| D1 Homepage trainer | Render B4 | B4 | Medium | Eng | Needs rebuild |
| D2 Missions / Progress | Becoming not vanity | A1·Laws | Medium | Eng | Exists — needs filter |
| D3 Moments / Timeline | Continuity visible | A3 | Medium | Eng | Not started |
| D4 Canvas | Parked | — | Low | Eng | Future |
| D5 Discovery | Parked | D1 trust | Medium | Eng | Future |
| D6 Coach interaction | First principle (CFP-001) + excellence gate (CFX-001) | IV-AI-007 · IV-AI-002 · IV-AI-006 | Medium | Eng | In Development |

## Phase E — Validate & Iterate (EXEC Steps 17–18)

| Item | Goal | Dependencies | Complexity | Owner | Status |
|---|---|---|---|---|---|
| E1 User testing | Trust, clarity, engagement, confidence, learning, readiness, retention | Phases A–D MVP | Medium | Founder / Atlas | Not started |
| E2 Iterate | Improve existing before new | E1 evidence | Ongoing | Eng | Rule active |

---

## Sequencing rule

Improve existing systems before introducing new ones (EXEC Step 18 / Operating Rule).

## Deliverable

- [x] Master Roadmap with Goal · Dependencies · Complexity · Owner · Status
- [x] Aligned to DEP-MAP and PRIORITY
