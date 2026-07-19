# ATOS Repository Navigation

| Field | Value |
|---|---|
| **Document ID** | ATOS-NAV |
| **Version** | 1.0.0 |
| **Status** | Authoritative |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | On ATOS version / structural nav change |
| **Dependencies** | RES-001, RES-002, ATOS-ROOT, ADR-0001 |
| **Related Documents** | `atos/registries/INDEX.md`, `atos/RELEASE-1.0.0.md` |
| **Approval History** | 2026-07-18 — M1 Draft; 2026-07-18 — v1.0.0 package; 2026-07-19 — MS-SYNC links |
| **Change Log** | 2026-07-19 — ATLAS-P0 / RES-003 Phase 0 Design Contract |

---

## Start here

1. [`/ATOS.md`](../ATOS.md) — system entrypoint  
2. [`resolutions/RES-001-atos-v1-implementation.md`](resolutions/RES-001-atos-v1-implementation.md) — implementation authorization  
3. This file — human navigation map  
4. [`registries/document-registry.yaml`](registries/document-registry.yaml) — machine index  

---

## Level 1 — Specifications (Authoritative)

| ID | Document | Path |
|---|---|---|
| SPEC-001 | Core Architecture | [specifications/SPEC-001-core-architecture.md](specifications/SPEC-001-core-architecture.md) |
| SPEC-002 | Identity | [specifications/SPEC-002-identity.md](specifications/SPEC-002-identity.md) |
| SPEC-003 | Knowledge Governance (TKGS) | [specifications/SPEC-003-knowledge-governance.md](specifications/SPEC-003-knowledge-governance.md) |
| SPEC-004 | Operations | [specifications/SPEC-004-operations.md](specifications/SPEC-004-operations.md) |
| SPEC-005 | Runtime Infrastructure | [specifications/SPEC-005-runtime-infrastructure.md](specifications/SPEC-005-runtime-infrastructure.md) |
| SPEC-006 | Executive Systems | [specifications/SPEC-006-executive-systems.md](specifications/SPEC-006-executive-systems.md) |

**Authority chain:** SPEC-001 → SPEC-002 → SPEC-003 → SPEC-004 → SPEC-005 / SPEC-006

---

## Level 2 — Standards (Authoritative)

| ID | Document | Path | Parent Spec |
|---|---|---|---|
| STD-001 | Architecture Decision (ADS) | [standards/STD-001-architecture-decision-standard.md](standards/STD-001-architecture-decision-standard.md) | SPEC-001, SPEC-006 |
| STD-002 | Knowledge Promotion (KPS) | [standards/STD-002-knowledge-promotion-standard.md](standards/STD-002-knowledge-promotion-standard.md) | SPEC-003 |
| STD-003 | Executive Decision (EDS) | [standards/STD-003-executive-decision-standard.md](standards/STD-003-executive-decision-standard.md) | SPEC-006 |
| STD-004 | Project Governance (PGS) | [standards/STD-004-project-governance-standard.md](standards/STD-004-project-governance-standard.md) | SPEC-004 |
| STD-005 | Incident & Investigation (IIS) | [standards/STD-005-incident-investigation-standard.md](standards/STD-005-incident-investigation-standard.md) | SPEC-004 |
| STD-006 | Runtime Workflow (RWS) | [standards/STD-006-runtime-workflow-standard.md](standards/STD-006-runtime-workflow-standard.md) | SPEC-005 |

---

## Level 3 — Operating Manuals (Draft)

Core manuals present as **Draft**: MAN-001, MAN-002, MAN-003, MAN-013, MAN-016, MAN-017.  
Deferred planned (not in v1.0 package): MAN-004, MAN-009, MAN-012.

See [`manuals/README.md`](manuals/README.md) and Document Registry.

---

## Level 4 — References

Sparse tree. Templates include REF-R1100, REF-R1101 (ADR template), REF-R1104, REF-R1108, REF-R1109, REF-R1110. Historical archive is scaffold.

See [`references/README.md`](references/README.md).

## Knowledge Governance (M4)

| ID | Document | Path |
|---|---|---|
| GOV-KNOW | Knowledge Governance Operations | [governance/knowledge-governance-operations.md](governance/knowledge-governance-operations.md) |
| REG-KNOW | Knowledge Registry | [registries/knowledge-registry.yaml](registries/knowledge-registry.yaml) |
| KNOW-ROOT | Knowledge Stores | [knowledge/README.md](knowledge/README.md) |
| REG-PROMO-Q | Promotion Queue | [knowledge/promotion/queue.yaml](knowledge/promotion/queue.yaml) |
| KNOW-CLASS-LEGACY | Legacy Corpus Classification | [knowledge/classifications/legacy-atlas-corpus.md](knowledge/classifications/legacy-atlas-corpus.md) |
| REF-R1110 | Promotion Request Template | [references/templates/REF-R1110-knowledge-promotion-request.md](references/templates/REF-R1110-knowledge-promotion-request.md) |

## Runtime Infrastructure (M5)

| ID | Document | Path |
|---|---|---|
| GOV-RUNTIME | Runtime Governance | [governance/runtime-governance.md](governance/runtime-governance.md) |
| RUNTIME-ROOT | Runtime Root | [runtime/README.md](runtime/README.md) |
| RUNTIME-IFACE | Component Interfaces | [runtime/interfaces.md](runtime/interfaces.md) |
| RUNTIME-CTX | Context Framework | [runtime/context-framework.md](runtime/context-framework.md) |
| RUNTIME-MEM | Memory Classification | [runtime/memory-classification.md](runtime/memory-classification.md) |
| RUNTIME-WF | Workflows | [runtime/workflows.md](runtime/workflows.md) |
| MAN-013 | Runtime Operations Manual | [manuals/MAN-013-runtime-operations.md](manuals/MAN-013-runtime-operations.md) |
| REG-RUNTIME | Runtime Registry | [registries/runtime-registry.yaml](registries/runtime-registry.yaml) |

## Executive Systems (M6)

| ID | Document | Path |
|---|---|---|
| EXEC-ROOT | Executive Package | [executives/README.md](executives/README.md) |
| CHARTER-ATLAS | Atlas Charter | [executives/charters/CHARTER-ATLAS.md](executives/charters/CHARTER-ATLAS.md) |
| CHARTER-SENTINEL | Sentinel Charter | [executives/charters/CHARTER-SENTINEL.md](executives/charters/CHARTER-SENTINEL.md) |
| CHARTER-FOUNDER | Founder Charter | [executives/charters/CHARTER-FOUNDER.md](executives/charters/CHARTER-FOUNDER.md) |
| CHARTER-PRODUCT | Product Charter | [executives/charters/CHARTER-PRODUCT.md](executives/charters/CHARTER-PRODUCT.md) |
| CHARTER-ENGINEERING | Engineering Charter | [executives/charters/CHARTER-ENGINEERING.md](executives/charters/CHARTER-ENGINEERING.md) |
| CHARTER-GROWTH | Growth Charter | [executives/charters/CHARTER-GROWTH.md](executives/charters/CHARTER-GROWTH.md) |
| CHARTER-KNOWLEDGE | Knowledge Charter | [executives/charters/CHARTER-KNOWLEDGE.md](executives/charters/CHARTER-KNOWLEDGE.md) |
| CHARTER-CUSTOMER | Customer Charter | [executives/charters/CHARTER-CUSTOMER.md](executives/charters/CHARTER-CUSTOMER.md) |
| CHARTER-FINANCE | Finance Charter | [executives/charters/CHARTER-FINANCE.md](executives/charters/CHARTER-FINANCE.md) |
| CHARTER-OPERATIONS | Operations Charter | [executives/charters/CHARTER-OPERATIONS.md](executives/charters/CHARTER-OPERATIONS.md) |
| ATLAS-P4 | Phase 4 Executive Organization Contract | [executives/atlas-program/PHASE-4-EXECUTIVE-ORGANIZATION.md](executives/atlas-program/PHASE-4-EXECUTIVE-ORGANIZATION.md) |
| RES-007 | Atlas Phase 4 Ratification | [resolutions/RES-007-atlas-phase-4-executive-organization.md](resolutions/RES-007-atlas-phase-4-executive-organization.md) |
| ATLAS-P5 | Phase 5 Atlas Internal Organization Contract | [executives/atlas-program/PHASE-5-ATLAS-INTERNAL-ORGANIZATION.md](executives/atlas-program/PHASE-5-ATLAS-INTERNAL-ORGANIZATION.md) |
| RES-008 | Atlas Phase 5 Ratification | [resolutions/RES-008-atlas-phase-5-internal-organization.md](resolutions/RES-008-atlas-phase-5-internal-organization.md) |
| ATLAS-SUCCESSION | CoS Continuity & Succession | [executives/atlas-program/ATLAS-SUCCESSION.md](executives/atlas-program/ATLAS-SUCCESSION.md) |
| ATLAS-HANDOFF-REGISTER | Atlas Handoff Register | [executives/atlas-program/ATLAS-HANDOFF-REGISTER.md](executives/atlas-program/ATLAS-HANDOFF-REGISTER.md) |
| ATLAS-ENG-PROGRAM | Atlas Engineering Program (AIO staff) | [executives/atlas-program/ATLAS-ENGINEERING-PROGRAM.md](executives/atlas-program/ATLAS-ENGINEERING-PROGRAM.md) |
| ATLAS-AIF-PROGRAM | Atlas Program Desk (AIF under Core) | [executives/atlas-program/ATLAS-PROGRAM-DESK.md](executives/atlas-program/ATLAS-PROGRAM-DESK.md) |
| ATLAS-ORG-VAL | Org Validation & Certification (Stages 1–7) | [executives/atlas-program/ATLAS-ORG-VALIDATION.md](executives/atlas-program/ATLAS-ORG-VALIDATION.md) |
| ATLAS-P6 | Phase 6 Operationalization | [executives/atlas-program/PHASE-6-OPERATIONALIZATION.md](executives/atlas-program/PHASE-6-OPERATIONALIZATION.md) |
| RES-009 | Atlas Phase 6 Ratification | [resolutions/RES-009-atlas-phase-6-operationalization.md](resolutions/RES-009-atlas-phase-6-operationalization.md) |
| ATLAS-P6-EXEC | Phase 6 Execution Program (ORR WPs) | [executives/atlas-program/ATLAS-P6-EXECUTION.md](executives/atlas-program/ATLAS-P6-EXECUTION.md) |
| ATLAS-ORR | Operational Readiness Report (Certified) | [executives/atlas-program/ATLAS-ORR.md](executives/atlas-program/ATLAS-ORR.md) |
| RES-010 | Atlas Runtime Organization v1.0 Certification | [resolutions/RES-010-atlas-runtime-organization-certification.md](resolutions/RES-010-atlas-runtime-organization-certification.md) |
| EXEC-ORG-COMM | Org Communication | [executives/atlas-program/ORG-COMMUNICATION.md](executives/atlas-program/ORG-COMMUNICATION.md) |
| EXEC-ORG-DECISIONS | Org Decision Governance | [executives/atlas-program/ORG-DECISION-GOVERNANCE.md](executives/atlas-program/ORG-DECISION-GOVERNANCE.md) |
| EXEC-ORG-CADENCE | Org Cadence | [executives/atlas-program/ORG-CADENCE.md](executives/atlas-program/ORG-CADENCE.md) |
| EXEC-COLLAB | Collaboration | [executives/collaboration.md](executives/collaboration.md) |
| MAN-001 | Founder Manual | [manuals/MAN-001-founder-operating-manual.md](manuals/MAN-001-founder-operating-manual.md) |
| MAN-002 | Atlas Manual | [manuals/MAN-002-atlas-operating-manual.md](manuals/MAN-002-atlas-operating-manual.md) |
| MAN-003 | Sentinel Manual | [manuals/MAN-003-sentinel-operating-manual.md](manuals/MAN-003-sentinel-operating-manual.md) |
| MAN-016 | AI Executive Manual | [manuals/MAN-016-ai-executive-manual.md](manuals/MAN-016-ai-executive-manual.md) |
| REG-EXEC | Executive Registry | [registries/executive-registry.yaml](registries/executive-registry.yaml) |

## Founder Workspace (M7)

| ID | Document | Path |
|---|---|---|
| FWS-ROOT | Founder Workspace | [founder/README.md](founder/README.md) |
| FWS-DASH | Executive Dashboard | [founder/dashboard.md](founder/dashboard.md) |
| FWS-REPORTS | Founder Reports | [founder/reports.md](founder/reports.md) |
| FWS-PLAN | Strategic Planning | [founder/planning.md](founder/planning.md) |
| FWS-REVIEWS | Review Workflows | [founder/reviews.md](founder/reviews.md) |
| MAN-017 | Founder Intelligence Manual | [manuals/MAN-017-founder-intelligence-manual.md](manuals/MAN-017-founder-intelligence-manual.md) |
| REG-FWS | Founder Workspace Registry | [registries/founder-workspace-registry.yaml](registries/founder-workspace-registry.yaml) |

## Operational Validation (M8)

| ID | Document | Path |
|---|---|---|
| VAL-ROOT | Validation Package | [validation/README.md](validation/README.md) |
| VAL-CHECK | Validation Checklist | [validation/checklist.md](validation/checklist.md) |
| VAL-MVI | MVI Readiness Scorecard | [validation/mvi-readiness.md](validation/mvi-readiness.md) |
| MS-M8 | Milestone M8 | [milestones/M8-operational-validation.md](milestones/M8-operational-validation.md) |

## Version 1.0.0 Release (M9)

| ID | Document | Path |
|---|---|---|
| ATOS-RELEASE-1.0.0 | Release Notes | [RELEASE-1.0.0.md](RELEASE-1.0.0.md) |
| RES-002 | Spec/Standard Ratification | [resolutions/RES-002-atos-v1-ratification.md](resolutions/RES-002-atos-v1-ratification.md) |
| GOV-FREEZE-1.0.0 | Freeze Policy | [governance/GOV-FREEZE-1.0.0.md](governance/GOV-FREEZE-1.0.0.md) |
| VERSION | Version Pin | [VERSION](VERSION) |
| MS-M9 | Milestone M9 | [milestones/M9-version-1-release.md](milestones/M9-version-1-release.md) |

---

## Governance & control

| ID | Document | Path |
|---|---|---|
| ADR-0001 | Repository Layout | [governance/ADR-0001-repository-layout.md](governance/ADR-0001-repository-layout.md) |
| GOV-REPO | Repository Governance | [governance/repository-governance.md](governance/repository-governance.md) |
| GOV-AUTH | Authority Model | [governance/authority-model.md](governance/authority-model.md) |
| GOV-META | Metadata Framework | [governance/metadata-framework.md](governance/metadata-framework.md) |
| GOV-META-APP | Metadata Application | [governance/metadata-application.md](governance/metadata-application.md) |
| REF-R1100 | Metadata Template | [references/templates/REF-R1100-document-metadata-template.md](references/templates/REF-R1100-document-metadata-template.md) |
| REF-R1101 | ADR Template | [references/templates/REF-R1101-architecture-decision-record-template.md](references/templates/REF-R1101-architecture-decision-record-template.md) |
| REG-OWN | Ownership Registry | [registries/ownership-registry.yaml](registries/ownership-registry.yaml) |
| GOV-REG | Registry Framework | [governance/registry-framework.md](governance/registry-framework.md) |
| GOV-MAINT-1.0.0 | Maintenance Mode | [governance/GOV-MAINT-1.0.0.md](governance/GOV-MAINT-1.0.0.md) |
| ATLAS-P0 | Atlas Phase 0 Design Contract | [executives/atlas-program/PHASE-0-DESIGN-CONTRACT.md](executives/atlas-program/PHASE-0-DESIGN-CONTRACT.md) |
| ATLAS-P1 | Atlas Phase 1 Executive Architecture | [executives/atlas-program/PHASE-1-EXECUTIVE-ARCHITECTURE.md](executives/atlas-program/PHASE-1-EXECUTIVE-ARCHITECTURE.md) |
| RES-004 | Atlas Phase 1 Ratification | [resolutions/RES-004-atlas-phase-1-executive-architecture.md](resolutions/RES-004-atlas-phase-1-executive-architecture.md) |
| ATLAS-P2 | Atlas Phase 2 Executive Infrastructure | [executives/atlas-program/PHASE-2-EXECUTIVE-INFRASTRUCTURE.md](executives/atlas-program/PHASE-2-EXECUTIVE-INFRASTRUCTURE.md) |
| RES-005 | Atlas Phase 2 Ratification | [resolutions/RES-005-atlas-phase-2-executive-infrastructure.md](resolutions/RES-005-atlas-phase-2-executive-infrastructure.md) |
| ATLAS-P3 | Atlas Phase 3 Runtime Architecture (Authoritative) | [executives/atlas-program/PHASE-3-RUNTIME-ARCHITECTURE.md](executives/atlas-program/PHASE-3-RUNTIME-ARCHITECTURE.md) |
| RES-006 | Atlas Phase 3 Ratification | [resolutions/RES-006-atlas-phase-3-runtime-architecture.md](resolutions/RES-006-atlas-phase-3-runtime-architecture.md) |
| ATLAS-D-W4 | W4 Operational Readiness Decision | [executives/atlas-program/DECISION-W4-OPERATIONAL-READINESS.md](executives/atlas-program/DECISION-W4-OPERATIONAL-READINESS.md) |
| ATLAS-D-FLAGS | Runtime Flags Decision (TARGET on) | [executives/atlas-program/DECISION-RUNTIME-FLAGS.md](executives/atlas-program/DECISION-RUNTIME-FLAGS.md) |
| ATLAS-GATE-FV | Founder-Visible Runtime Gate | [executives/atlas-program/GATE-FOUNDER-VISIBLE.md](executives/atlas-program/GATE-FOUNDER-VISIBLE.md) |
| RES-003 | Atlas Phase 0 Ratification | [resolutions/RES-003-atlas-phase-0-design-contract.md](resolutions/RES-003-atlas-phase-0-design-contract.md) |
| GOV-COMPAT | Pre-ATOS Compatibility | [governance/compatibility-atlas-pre-atos.md](governance/compatibility-atlas-pre-atos.md) |
| GOV-IDQ | ID Namespace Quarantine | [governance/id-namespace-quarantine.md](governance/id-namespace-quarantine.md) |

---

## Registries

Human index: [registries/INDEX.md](registries/INDEX.md)  
Operations: [governance/registry-operations.md](governance/registry-operations.md)

| Registry | Path | M2 core |
|---|---|---|
| ATOS | [registries/atos-registry.yaml](registries/atos-registry.yaml) | Yes |
| Documents | [registries/document-registry.yaml](registries/document-registry.yaml) | Yes |
| Executives | [registries/executive-registry.yaml](registries/executive-registry.yaml) | Yes |
| Projects | [registries/project-registry.yaml](registries/project-registry.yaml) | Yes |
| Knowledge | [registries/knowledge-registry.yaml](registries/knowledge-registry.yaml) | Supporting |
| Architecture | [registries/architecture-registry.yaml](registries/architecture-registry.yaml) | Supporting |
| Repository Index | [registries/repository-index.yaml](registries/repository-index.yaml) | Supporting |

---

## Legacy plane (do not treat as ATOS Canonical)

| Path | Role |
|---|---|
| [`../atlas/`](../atlas/) | Pre-ATOS Ask Atlas corpus + Founder OS ops (see GOV-COMPAT) |

---

## Cross-reference rules (M1)

1. Every Spec lists Dependencies and Related Documents in metadata.  
2. Every Standard lists its parent Spec(s).  
3. Navigation and Document Registry must agree on paths.  
4. Specs/Standards are **Authoritative** (RES-002). `Scaffold` / `Draft` / `Review` artifacts are **not** Canonical for AI context loaders.
