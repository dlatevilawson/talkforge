# Atlas — Handoff Register (Live Operational State)

| Field | Value |
|---|---|
| **Document ID** | ATLAS-HANDOFF-REGISTER |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas (AIO-CORE accountable) |
| **Human Approver** | Founder |
| **Review Cycle** | After material decisions / Weekly Review / before absence |
| **Dependencies** | ATLAS-SUCCESSION, ATLAS-P4, ATLAS-P5, CHARTER-ATLAS |
| **Related Documents** | ATLAS-GATE-FV, ATLAS-D-FLAGS, REG-EXEC |
| **Approval History** | 2026-07-19 — Initial register for succession continuity |
| **Change Log** | 2026-07-19 — Seeded from ratified program state |

---

## Register metadata

| Field | Value |
|---|---|
| **Last updated** | 2026-07-19 |
| **Updated by** | Atlas |
| **Staleness rule** | If older than 7 days or last Weekly Review, successor must refresh before counsel |

**Program note:** [`ATLAS-ENG-PROGRAM`](ATLAS-ENGINEERING-PROGRAM.md) issued — Engineering owns WP-S0…S9; Atlas coordinates acceptance.  
**Program Desk:** [`ATLAS-AIF-PROGRAM`](ATLAS-PROGRAM-DESK.md) — AIF-PROGRAM inside AIO-CORE owns register currency (not a sixth AIO).

This file is **operational**, not Canonical law. It must stay accurate so succession does not require tribal memory.

---

## 1. Binding contract stack (do not edit casually)

| Layer | ID | Status |
|---|---|---|
| Design | ATLAS-P0 / RES-003 | Authoritative |
| Architecture | ATLAS-P1 / RES-004 | Authoritative |
| Infrastructure | ATLAS-P2 / RES-005 | Authoritative |
| Runtime | ATLAS-P3 / RES-006 | Authoritative |
| Company org | ATLAS-P4 / RES-007 | Authoritative |
| Atlas staff | ATLAS-P5 / RES-008 | Authoritative |
| Continuity | ATLAS-SUCCESSION | Authoritative |

---

## 2. Runtime flag posture

| Flag | Value | Authority |
|---|---|---|
| `ATLAS_RUNTIME_TARGET` | **On** (default) | ATLAS-D-FLAGS |
| `ATLAS_RUNTIME_FOUNDER_VISIBLE` | **Off** | ATLAS-D-FLAGS; awaiting ATLAS-GATE-FV + Founder Decision |
| Loader freeze (`atlas/engine/loader.ts`) | **Frozen** | ATLAS-P3 / GOV-COMPAT |

Observation window active: target runs internally; Legacy serves Founder-visible responses.

---

## 3. Company executive posture (REG-EXEC)

| Office | Status | Notes for successor |
|---|---|---|
| Founder | Active | Constitutional authority |
| Atlas | Active | Coordinates; does not constitute org |
| Sentinel | Active | Engineering integrity — GUARD ≠ Sentinel |
| Product / Engineering / Growth / Knowledge / Customer / Finance / Operations | Planned (chartered) | Designed under P4; activation = Founder appointment |
| CIO (implementation agent) | Transitional | Not a permanent P4 office |

---

## 4. Open Founder gates / decisions needed

| Item | Status | Needed from Founder |
|---|---|---|
| Enable `ATLAS_RUNTIME_FOUNDER_VISIBLE` | Open | Review observation evidence (`npm run atlas:runtime:observe`); separate Decision |
| Appoint planned EXEC-* offices | Open | Appointments are Founder-exclusive |
| Loader freeze lift | Closed until explicit Decision | Do not change loader |

---

## 5. Open coordination threads

| Thread | Owners | State |
|---|---|---|
| AIO staff Engineering Program (S0–S9) | Atlas (coord) + Engineering (Cursor) | **ATLAS-ENG-PROGRAM Authoritative** — awaiting WP-S0 start; no production code in program doc |
| Atlas Program Desk (AIF-PROGRAM) | AIO-CORE function | **ATLAS-AIF-PROGRAM Authoritative** — tracks WP/wave/VC/deps; WP-S0 must not create sixth AIO |
| Organizational Validation (Stages 1–7) | Atlas + Engineering harnesses | Stage 1 PASS; Stages 2–5 PARTIAL via `atlas:staff:check`; Stage 6 PENDING; **not certified** |
| Phase 6 Operationalization | Atlas + Engineering | **ATLAS-P6 / RES-009** — five AIO packs + staff pipeline live; ORR not issued |
| Sprint 1 / WP-S0 Ownership Skeleton | Engineering | **PASS** — evidence `atlas/runtime/evidence/WP-S0-OWNERSHIP.md`; VC1 met |
| P6-EXEC WP-S1 Office Capability | Engineering + Atlas | **PASS** — Founder-approved 2026-07-19 |
| P6-EXEC WP-S2 Cross-Office Coordination | Engineering + Atlas | **PASS** — Founder-approved 2026-07-19 |
| P6-EXEC WP-S3 Authority & Conflict | Engineering + Atlas | **PASS** — Founder-approved 2026-07-19 |
| P6-EXEC WP-S4 Failure Injection | Engineering + Atlas | **PASS** — Founder-approved 2026-07-19 |
| P6-EXEC WP-S5 Operational Stress | Engineering + Atlas | **PASS** — Founder-approved |
| Atlas Runtime Organization v1.0 | Founder | **CERTIFIED** (RES-010 / ATLAS-ORR) — continued development within validated framework |
| `ATLAS_RUNTIME_FOUNDER_VISIBLE` | Founder | **Still off** — certification does not enable; separate Decision required |
| Loader freeze | Founder | **Still frozen** — separate Decision required |
| Founder-visible gate evidence | Atlas Guard/Intel + Founder | Suite exists; operational observation continues |
| Planned executive activation | Founder | Charters Authoritative; offices not yet appointed |

*(Add rows as threads open. Close rows when Decision Record exists.)*

---

## 6. Material Risk Notices in force

| Source | Summary | Must appear in Founder packs? |
|---|---|---|
| — | None recorded in this register seed | — |

**Rule:** Sentinel Risk Notices are never edited. If present, list here and force into briefs.

---

## 7. Pending Decision Packs / Escalations

| ID | Type | Status |
|---|---|---|
| — | None open at seed | — |

---

## 8. Standing priorities (Founder-binding only when Decision Recorded)

| Priority | Source | Binding? |
|---|---|---|
| Maintain ATOS Maintenance Mode | RES-002 / GOV-MAINT | Yes |
| Atlas coordinates; does not become the org | ATLAS-P4 / P5 | Yes |
| Keep FOUNDER_VISIBLE off until gate + Decision | ATLAS-D-FLAGS / GATE-FV | Yes |
| Successor can operate from docs + this register | ATLAS-SUCCESSION | Yes (standing obligation) |

Do **not** invent new binding priorities here. Propose via Decision Pack.

---

## 9. Cadence next actions

| Cadence | Next Atlas action |
|---|---|
| Daily | Counsel → Guard → Core brief draft when Founder surface active |
| Weekly | Broker intake + weekly pack when exec review runs |
| Observation | Keep `atlas:runtime:observe` green; do not enable FOUNDER_VISIBLE unilaterally |

---

## 10. Successor attestation (complete on handoff)

| Check | Yes/No |
|---|---|
| Read Charter + P0–P5 + ORG-* | |
| Confirmed GUARD ≠ Sentinel | |
| Confirmed flag posture | |
| Handoff Register current | |
| Listed open C3/C4 / Risk Notices | |
| Will not invent Canonical / bind Founder | |

**Successor name:** _______________  
**Date:** _______________  
**Founder acknowledgment:** _______________  
