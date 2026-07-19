# Atlas Program — Phase 6 Operationalization Contract

| Field | Value |
|---|---|
| **Document ID** | ATLAS-P6 |
| **Version** | 1.0.0 |
| **Status** | Authoritative |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Until Founder-amended / ORR Decision |
| **Dependencies** | RES-009, ATLAS-P0…P5, ATLAS-ENG-PROGRAM, ATLAS-AIF-PROGRAM, ATLAS-ORG-VAL, ATLAS-D-FLAGS |
| **Related Documents** | ATLAS-ORR (when issued), `atlas/runtime/staff/*` |
| **Approval History** | 2026-07-19 — Founder directed Phase 6: make the organization exist |
| **Change Log** | 2026-07-19 — Operationalization contract; docs are not the deliverable |

---

## Objective

**Not** more documents. **Make the organization exist.**

| # | Work | Done when |
|---|---|---|
| 1 | Build each AIO office | `atlas/runtime/staff/*` facades executable |
| 2 | Operating charter per office | Loadable office pack (mission, limits, interfaces) |
| 3 | Prompts, standards, success metrics per office | In the same office pack; enforced in checks |
| 4 | Connect via Atlas coordination layer | Staff-coordinated pipeline + event bus |
| 5 | Automatic delegation | Core `task_assigned` before staff work |
| 6 | Measure delegation effectiveness | Delegation metrics + TE-linked checks |
| 7 | ORR Stages 2–6 | ATLAS-ORG-VAL evidence PASS |
| 8 | Certify | ATLAS-ORR + **Founder Decision** only |

Strategic capability expansion is **forbidden** until Step 8.

---

## Binding rules

1. Subordinate to P0–P5; conflict → change implementation, not those contracts.  
2. AIF-PROGRAM tracks progress; does not become a sixth AIO.  
3. GUARD ≠ Sentinel.  
4. FOUNDER_VISIBLE / loader freeze remain Founder-gated.  
5. Certification ≠ enabling Founder-visible cutover unless Founder unifies Decisions.

---

## Implementation locus

| Asset | Role |
|---|---|
| `atlas/runtime/staff/` | Living organization (code) |
| `atlas/runtime/staff/offices/` | Operating packs (charter + prompts + standards + metrics) |
| ATLAS-ENG-PROGRAM | WP sequence guidance |
| ATLAS-ORG-VAL | Validation Stages 2–7 |

---

## Exit

Phase 6 exits only when Steps 7–8 complete under ATLAS-ORG-VAL. Until then: **operationalizing, not certified.**
