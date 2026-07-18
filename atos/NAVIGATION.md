# ATOS Repository Navigation

| Field | Value |
|---|---|
| **Document ID** | ATOS-NAV |
| **Version** | 1.0.0-m2 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each milestone |
| **Dependencies** | RES-001, ATOS-ROOT, ADR-0001 |
| **Related Documents** | `atos/registries/INDEX.md`, `atos/governance/registry-operations.md` |
| **Approval History** | 2026-07-18 — M1 Draft |
| **Change Log** | 2026-07-18 — Initial navigation; 2026-07-18 — M2 registry index links |

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

---

## Governance & control

| ID | Document | Path |
|---|---|---|
| ADR-0001 | Repository Layout | [governance/ADR-0001-repository-layout.md](governance/ADR-0001-repository-layout.md) |
| GOV-REPO | Repository Governance | [governance/repository-governance.md](governance/repository-governance.md) |
| GOV-AUTH | Authority Model | [governance/authority-model.md](governance/authority-model.md) |
| GOV-META | Metadata Framework | [governance/metadata-framework.md](governance/metadata-framework.md) |
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
