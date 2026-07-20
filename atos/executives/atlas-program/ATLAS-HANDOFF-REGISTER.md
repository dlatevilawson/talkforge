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
| **Change Log** | 2026-07-20 — RES-012: STRAT-001 accepted w/ amendments; FLA-001; PPS-001 active |

---

## Register metadata

| Field | Value |
|---|---|
| **Last updated** | 2026-07-20 |
| **Updated by** | Atlas |
| **Standing priority** | **PPS-001 Product Proof** on technical-interview wedge (RES-012); Atlas coordinates |
| **Staleness rule** | If older than 7 days or last Weekly Review, successor must refresh before counsel |

**Company posture (RES-011 / RES-012):** Primary objective is building TalkForge. Atlas Organization v1.0 is **frozen infrastructure**. Active objective: **PPS-001**. Product Canonical: **FLA-001**. North Star: **transfer**.

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
| Product doctrine | FLA-001 / RES-012 | Authoritative (Product Canonical) |
| Active sprint | PPS-001 / RES-012 | Authoritative (Active) |

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

## 5. Coordination threads

### Closed / certified

| Thread | State |
|---|---|
| P6-EXEC WP-S0…S5 | **PASS** — evidence under `atlas/runtime/evidence/` |
| Organizational Validation + ORR | **CERTIFIED** — RES-010 / ATLAS-ORR v1.0 |
| Atlas Runtime Organization v1.0 | **CERTIFIED + FROZEN** — RES-012; infrastructure only |
| Atlas org redesign / new AIOs | **Frozen** — RES-011 / RES-012 |
| STRAT-001 Decision Requests 1–4 | **CLOSED** — RES-012 Accepted with Amendments |

### Active (company)

| Thread | Owners | State |
|---|---|---|
| **PPS-001 Product Proof Sprint** | Engineering + Atlas (coord) + Founder | **ACTIVE** — technical interview wedge; transfer proof |
| **FLA-001 conformance** | Product/Engineering/Atlas | Binding on coaches, sims, progress mechanics |
| Atlas Program Desk (AIF-PROGRAM) | AIO-CORE function | Live — product execution tracking; no org expansion |
| `ATLAS_RUNTIME_FOUNDER_VISIBLE` | Founder | **Still off** — not on PPS-001 critical path |
| Loader freeze | Founder | **Still frozen** |
| Planned EXEC-* activation | Founder | Charters Authoritative; appointments Founder-exclusive |

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
| STRAT-001 / RES-012 | C1 | **Closed** — Decisions 1–4 bound |
| PPS-001 exit (N users, ship calls) | C1/C2 as needed | Open during sprint — Founder sets thresholds; default N=10 instrumented attempts |
| Pricing hypothesis | C2/C1 | Deferred until transfer signal exists |
| EXEC appointments | C0 | Open — not blocking PPS-001 if Founder+Atlas interim labeled |
| FOUNDER_VISIBLE / loader | C1 | Keep off/frozen unless product reveals need |

---

## 8. Standing priorities (Founder-binding only when Decision Recorded)

| Priority | Source | Binding? |
|---|---|---|
| **Execute PPS-001** (prove transfer on tech-interview wedge) | RES-012 | Yes |
| North Star = transfer | RES-012 / FLA-001 | Yes |
| FLA-001 governs coaching & learning | RES-012 | Yes |
| Gamification only if transfer-justified | RES-012 | Yes |
| **Build TalkForge** (primary company objective) | RES-011 | Yes |
| Atlas serves TalkForge; org frozen as infrastructure | RES-011 / RES-012 | Yes |
| Atlas org changes require governance review | RES-011 / RES-010 | Yes |
| Maintain ATOS Maintenance Mode | RES-002 / GOV-MAINT | Yes |
| Atlas coordinates; does not become the org | ATLAS-P4 / P5 | Yes |
| Keep FOUNDER_VISIBLE off until gate + Decision | ATLAS-D-FLAGS / GATE-FV | Yes |
| Successor can operate from docs + this register | ATLAS-SUCCESSION | Yes (standing obligation) |

Do **not** invent new binding priorities here. Propose via Decision Pack.

---

## 9. Cadence next actions

| Cadence | Next Atlas action |
|---|---|
| Product | Execute PPS-001; challenge any work that is not wedge proof or FLA-conformant |
| Daily | Counsel → Guard → Core brief draft when Founder surface active |
| Weekly | Broker intake + weekly pack when exec review runs |
| Observation | Keep `atlas:runtime:observe` green; do not enable FOUNDER_VISIBLE unilaterally |
| Org | Do not redesign Atlas staff/AIOs without governance review |

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
