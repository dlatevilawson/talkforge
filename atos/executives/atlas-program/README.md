# Atlas Program

| Field | Value |
|---|---|
| **Document ID** | ATLAS-PROGRAM |
| **Version** | 2.2.0 |
| **Status** | Authoritative |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | On Atlas Program phase change |
| **Dependencies** | RES-002…RES-010, SPEC-006 |
| **Related Documents** | ATLAS-P0…P5, CHARTER-*, MAN-002 |
| **Approval History** | 2026-07-19 — Phases 0–5 ratified |
| **Change Log** | 2026-07-19 — RES-010: Atlas Runtime Organization v1.0 Founder-certified |

---

## Purpose

The Atlas Program designs and implements Atlas as Executive Intelligence operating **under** ATOS.

**Atlas coordinates the executive organization but does not constitute the organization.**

This is work **built on ATOS**, not an ATOS constitutional rewrite. ATOS Program Status remains CLOSED / Maintenance Mode.

## Binding contracts

| Phase | Document | Resolution | Role |
|---|---|---|---|
| 0 | [PHASE-0-DESIGN-CONTRACT.md](PHASE-0-DESIGN-CONTRACT.md) (`ATLAS-P0`) | RES-003 | What Atlas is |
| 1 | [PHASE-1-EXECUTIVE-ARCHITECTURE.md](PHASE-1-EXECUTIVE-ARCHITECTURE.md) (`ATLAS-P1`) | RES-004 | How Atlas is organized internally |
| 2 | [PHASE-2-EXECUTIVE-INFRASTRUCTURE.md](PHASE-2-EXECUTIVE-INFRASTRUCTURE.md) (`ATLAS-P2`) | RES-005 | Infrastructure that realizes Phase 1 |
| 3 | [PHASE-3-RUNTIME-ARCHITECTURE.md](PHASE-3-RUNTIME-ARCHITECTURE.md) (`ATLAS-P3`) | RES-006 | Runtime architecture that realizes Phase 2 |
| 4 | [PHASE-4-EXECUTIVE-ORGANIZATION.md](PHASE-4-EXECUTIVE-ORGANIZATION.md) (`ATLAS-P4`) | RES-007 | Permanent executive organization Atlas coordinates |
| 5 | [PHASE-5-ATLAS-INTERNAL-ORGANIZATION.md](PHASE-5-ATLAS-INTERNAL-ORGANIZATION.md) (`ATLAS-P5`) | RES-008 | Atlas internal staff (AIO-*); GUARD ≠ Sentinel |
| 6 | [PHASE-6-OPERATIONALIZATION.md](PHASE-6-OPERATIONALIZATION.md) (`ATLAS-P6`) | RES-009 | Make the organization exist (runtime staff) |
| 6-exec | [ATLAS-P6-EXECUTION.md](ATLAS-P6-EXECUTION.md) (`ATLAS-P6-EXEC`) | Founder | Remaining ORR WPs S1–S6; Founder gate between WPs |

### Phase 4 companion contracts

| Doc | ID |
|---|---|
| [ORG-COMMUNICATION.md](ORG-COMMUNICATION.md) | EXEC-ORG-COMM |
| [ORG-DECISION-GOVERNANCE.md](ORG-DECISION-GOVERNANCE.md) | EXEC-ORG-DECISIONS |
| [ORG-CADENCE.md](ORG-CADENCE.md) | EXEC-ORG-CADENCE |
| [../charters/](../charters/) | CHARTER-* |

## Continuity (succession test)

| Doc | Role |
|---|---|
| [ATLAS-SUCCESSION.md](ATLAS-SUCCESSION.md) | Can another CoS take over from docs? |
| [ATLAS-HANDOFF-REGISTER.md](ATLAS-HANDOFF-REGISTER.md) | Live open state for handoff |

## Staff implementation (Phase 5 → Engineering)

| Doc | Role |
|---|---|
| [ATLAS-ENGINEERING-PROGRAM.md](ATLAS-ENGINEERING-PROGRAM.md) (`ATLAS-ENG-PROGRAM`) | Implementation specs for AIO-* via Engineering (Cursor); no production code in the program itself |
| [ATLAS-PROGRAM-DESK.md](ATLAS-PROGRAM-DESK.md) (`ATLAS-AIF-PROGRAM`) | Program Management as internal function under AIO-CORE (not a sixth office) |
| [ATLAS-ORG-VALIDATION.md](ATLAS-ORG-VALIDATION.md) (`ATLAS-ORG-VAL`) | Stages 1–7 validation; ORR + Founder Decision before “next phase” |
| [ORG-VAL-STATUS.md](../../../atlas/runtime/evidence/org-val/ORG-VAL-STATUS.md) | Live stage rollup |
| [ATLAS-ORR.md](ATLAS-ORR.md) | Operational Readiness Report — **Certified** (RES-010) |

**Living org:** [`atlas/runtime/staff/`](../../../atlas/runtime/staff/) — `npm run atlas:staff:check`

Atlas coordinates. Program Desk tracks. Offices execute. Validation precedes certification. Contracts govern.

## Runtime implementation (Phase 3 waves)

| Doc | Role |
|---|---|
| [IMPLEMENTATION-WAVES.md](IMPLEMENTATION-WAVES.md) | Wave status |
| [GATE-FOUNDER-VISIBLE.md](GATE-FOUNDER-VISIBLE.md) | FOUNDER_VISIBLE gate |
| [atlas/runtime/README.md](../../../atlas/runtime/README.md) | Target plane |

Future organizational growth shall **extend** Phase 4 rather than bypass it. Atlas staff growth extends Phase 5. Conflicts with ratified contracts change the design — not the contracts.
