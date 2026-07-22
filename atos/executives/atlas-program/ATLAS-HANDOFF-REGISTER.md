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
| **Change Log** | 2026-07-21 — RES-016 / PCI-001 craftsmanship stage; BETA-REC-002; DEPLOY-001; BR-001 NOT READY |

---

## Register metadata

| Field | Value |
|---|---|
| **Last updated** | 2026-07-21 |
| **Updated by** | Atlas |
| **Standing priority** | **Love-of-use craftsmanship (PCI-001)** + **CE-001** substrate; PPS-001 gated; BR-001 phone smoke still required before unsupervised invite |
| **Mission review** | [MR-001](../../product/MR-001-mission-review-strategic-reinforcement.md) — **Accepted (RES-014)**; governance checkpoint; doctrine unchanged |
| **Craftsmanship** | [PCI-001](../../product/PCI-001-product-craftsmanship-initiative.md) — **Accepted (RES-016)**; Craftsmanship Review mandatory on every product review |
| **Baseline CR** | [PCI-CR-001](../../product/PCI-CR-001-baseline-craftsmanship-review.md) — Working; share-test not yet passed |
| **Beta readiness** | [BR-001](../../product/BR-001-beta-readiness-assessment.md) — **Accepted (RES-015)**; **NOT READY**; deploy mitigated |
| **Production URL** | **https://talkforge-virid.vercel.app** ([DEPLOY-001](../../product/DEPLOY-001-founder-vercel.md)) |
| **Beta UX** | [BETA-REC-002](../../product/BETA-REC-002-welcoming-first-experience.md) — Accepted; deepened by PCI-001 |
| **Landing** | [LP-001](../../product/LP-001-production-landing.md) — Production landing built; **awaiting Founder deploy approval** for talkforge.io |

**Company posture (RES-013…016):** Stage = **build a product people immediately love using** (PCI-001). Engineering + craftsmanship equal discipline. CE-001 remains substrate. **PPS-001 gated.** Atlas org **frozen**. Mission unchanged (MR-001). **Craftsmanship Review mandatory** on every product review. External beta still **NOT READY** until BR-001 phone smoke + share-test trajectory.

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
| User growth model | PCM-001 / RES-013 | Authoritative (Product Canonical) |
| Founder Directive | DIR-CE-001 / RES-013 | **Critical — Approved for Execution** |
| Communication Engine | CE-001 | Approved for Execution (CE-M1→) |
| Product Proof | PPS-001 / RES-013 | **Gated** on CE-001 MVP |
| Mission Review checkpoint | MR-001 / RES-014 | **Accepted** — governance checkpoint (not new doctrine) |
| Beta readiness | BR-001 / RES-015 | **Accepted** — **NOT READY**; no external invite until Criticals clear |
| Product craftsmanship | PCI-001 / RES-016 | **Accepted** — Craftsmanship Review mandatory; Atlas org unchanged |

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
| **CE-001 Communication Engine** | Engineering + Atlas (coord) | CE-M1/M2 eng accepted; **pre-beta UX** (DEC-CE-M2-UX) in progress — presence over diagnostics |
| **PCM-001** | Engineering | Product Canonical — implement ingest with CE-M5 |
| **FLA-001 conformance** | Product/Engineering/Atlas | Binding on all CE decisions |
| **PPS-001 Product Proof Sprint** | — | **GATED** — may not begin until CE-001 MVP readiness |
| Atlas Program Desk (AIF-PROGRAM) | AIO-CORE function | Track CE milestones; no org expansion |
| `ATLAS_RUNTIME_FOUNDER_VISIBLE` | Founder | **Still off** |
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
| STRAT-001 / RES-012 | C1 | **Closed** |
| DIR-CE-001 / RES-013 | C1 | **Closed** — CE Critical; PPS gated |
| CE-001 MVP readiness declaration | C1/C2 | **Open** — required to ungate PPS-001 |
| PPS-001 exit (N users) | C1/C2 | Deferred until gate opens |
| Pricing hypothesis | C2/C1 | Deferred until transfer signal exists |
| EXEC appointments | C0 | Open — not blocking CE-001 |
| FOUNDER_VISIBLE / loader | C1 | Keep off/frozen unless product reveals need |

---

## 8. Standing priorities (Founder-binding only when Decision Recorded)

| Priority | Source | Binding? |
|---|---|---|
| **Execute CE-001** (Critical — Approved for Execution) | DIR-CE-001 / RES-013 | Yes |
| **Pre-beta presence/trust UX** (do not restore diagnostic chrome) | DEC-CE-M2-UX | Yes |
| **PPS-001 gated** until CE-001 MVP readiness | RES-013 | Yes |
| **MR-001 Accepted** — governance checkpoint for significant new ideas; no new frameworks / no doctrine change | RES-014 / MR-001 | Yes |
| **BR-001 Accepted** — NOT READY; no external invite until Criticals clear | RES-015 / BR-001 | Yes |
| **PCI-001 Accepted** — love-of-use; Craftsmanship Review on every product review; Atlas org unchanged | RES-016 / PCI-001 | Yes |
| PCM-001 = canonical user growth model | RES-013 | Yes |
| North Star = transfer (for PPS after gate) | RES-012 / FLA-001 | Yes |
| FLA-001 governs coaching & learning | RES-012 | Yes |
| Voice-first; typing fallback only | DIR-CE-001 | Yes |
| Gamification only if transfer-justified | RES-012 | Yes |
| **Build TalkForge** (primary company objective) | RES-011 | Yes |
| Atlas serves TalkForge; org frozen as infrastructure | RES-011 / RES-012 / RES-013 | Yes |
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
| Product | PCI-001 craftsmanship + CE substrate; BETA-REC-002 welcome/momentum; BR-001 phone smoke before unsupervised invite; Craftsmanship Review on every product counsel; MR-001 checkpoint; refuse PPS until CE MVP |
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
