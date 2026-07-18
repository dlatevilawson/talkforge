# ATOS Repository Navigation

| Field | Value |
|---|---|
| **Document ID** | ATOS-NAV |
| **Version** | 1.0.0-m7 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each milestone |
| **Dependencies** | RES-001, ATOS-ROOT, ADR-0001 |
| **Related Documents** | `atos/registries/INDEX.md`, `atos/governance/registry-operations.md` |
| **Approval History** | 2026-07-18 — M1 Draft |
| **Change Log** | 2026-07-18 — M1–M6 navigation; M7 Founder Workspace links |

---

## Start here

1. [`/ATOS.md`](../ATOS.md) — system entrypoint  
2. [`resolutions/RES-001-atos-v1-implementation.md`](resolutions/RES-001-atos-v1-implementation.md) — implementation authorization  
3. This file — human navigation map  
4. [`registries/document-registry.yaml`](registries/document-registry.yaml) — machine index  

---

## Level 1 — Specifications (Draft)

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

## Level 2 — Standards (Draft)

| ID | Document | Path | Parent Spec |
|---|---|---|---|
| STD-001 | Architecture Decision (ADS) | [standards/STD-001-architecture-decision-standard.md](standards/STD-001-architecture-decision-standard.md) | SPEC-001, SPEC-006 |
| STD-002 | Knowledge Promotion (KPS) | [standards/STD-002-knowledge-promotion-standard.md](standards/STD-002-knowledge-promotion-standard.md) | SPEC-003 |
| STD-003 | Executive Decision (EDS) | [standards/STD-003-executive-decision-standard.md](standards/STD-003-executive-decision-standard.md) | SPEC-006 |
| STD-004 | Project Governance (PGS) | [standards/STD-004-project-governance-standard.md](standards/STD-004-project-governance-standard.md) | SPEC-004 |
| STD-005 | Incident & Investigation (IIS) | [standards/STD-005-incident-investigation-standard.md](standards/STD-005-incident-investigation-standard.md) | SPEC-004 |
| STD-006 | Runtime Workflow (RWS) | [standards/STD-006-runtime-workflow-standard.md](standards/STD-006-runtime-workflow-standard.md) | SPEC-005 |

---

## Level 3 — Operating Manuals

Core manuals are **planned** (RES-001 priority). Bodies arrive in later milestones.

See [`manuals/README.md`](manuals/README.md) and Document Registry entries `MAN-001`…`MAN-013`.

---

## Level 4 — References

Sparse tree. Templates and historical folders are scaffolds.

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
| REG-OWN | Ownership Registry | [registries/ownership-registry.yaml](registries/ownership-registry.yaml) |
| GOV-REG | Registry Framework | [governance/registry-framework.md](governance/registry-framework.md) |
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
4. `Scaffold` / unapproved `Draft` Specs are **not** institutional law for AI context loaders.
