# Atlas Program

| Field | Value |
|---|---|
| **Document ID** | ATLAS-PROGRAM |
| **Version** | 1.0.0 |
| **Status** | Authoritative |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | On Atlas Program phase change |
| **Dependencies** | RES-002, RES-003, RES-004, RES-005, RES-006, SPEC-006 |
| **Related Documents** | ATLAS-P0, ATLAS-P1, ATLAS-P2, ATLAS-P3, CHARTER-ATLAS, MAN-002 |
| **Approval History** | 2026-07-19 — Program opened under ATOS; Phase 0–3 ratified |
| **Change Log** | 2026-07-19 — Phase 3 ratified (RES-006); implementation waves W0+ active |

---

## Purpose

The Atlas Program designs and implements Atlas as Executive Intelligence operating **under** ATOS.

This is work **built on ATOS**, not an ATOS constitutional rewrite. ATOS Program Status remains CLOSED / Maintenance Mode.

## Binding contracts

| Phase | Document | Resolution | Role |
|---|---|---|---|
| 0 | [PHASE-0-DESIGN-CONTRACT.md](PHASE-0-DESIGN-CONTRACT.md) (`ATLAS-P0`) | RES-003 | What Atlas is |
| 1 | [PHASE-1-EXECUTIVE-ARCHITECTURE.md](PHASE-1-EXECUTIVE-ARCHITECTURE.md) (`ATLAS-P1`) | RES-004 | How Atlas is organized |
| 2 | [PHASE-2-EXECUTIVE-INFRASTRUCTURE.md](PHASE-2-EXECUTIVE-INFRASTRUCTURE.md) (`ATLAS-P2`) | RES-005 | Infrastructure that realizes Phase 1 |
| 3 | [PHASE-3-RUNTIME-ARCHITECTURE.md](PHASE-3-RUNTIME-ARCHITECTURE.md) (`ATLAS-P3`) | RES-006 | Runtime architecture that realizes Phase 2 |

## Implementation

Implementation waves **W0+** are active under the Phase 3 Runtime Architecture Contract (`ATLAS-P3`, RES-006).

| Doc | Role |
|---|---|
| [IMPLEMENTATION-WAVES.md](IMPLEMENTATION-WAVES.md) (`ATLAS-WAVES`) | Wave status tracker |
| [atlas/runtime/README.md](../../../atlas/runtime/README.md) | Target plane modules |

All Atlas runtime design and implementation must satisfy Phase 0, Phase 1, Phase 2, and Phase 3. Conflicts change the design or implementation — not the ratified contracts.
