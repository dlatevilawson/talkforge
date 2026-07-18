# Atlas TalkForge Operating System (ATOS)

| Field | Value |
|---|---|
| **Document ID** | ATOS-ROOT |
| **Version** | 1.0.0-m0 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas (Chief of Staff) |
| **Human Approver** | Founder |
| **Review Cycle** | Per milestone / on governance change |
| **Dependencies** | RES-001 |
| **Related Documents** | `atos/governance/*`, `atos/registries/*` |
| **Approval History** | Authorized for v1.0 implementation by RES-001 (Founder approved) |
| **Change Log** | 2026-07-18 — M0 entrypoint created |

---

## Purpose

This file is the **canonical entrypoint** for humans and AI agents working with ATOS.

ATOS is the organizational operating system for TalkForge. It is not the product application. Product code lives under `app/`, `lib/`, and related paths. Pre-ATOS knowledge remains under `atlas/` until migrated through Knowledge Governance.

---

## Authority

Implementation of ATOS Version 1.0 is authorized by:

- **RES-001** — Founder Resolution for Version 1.0 Implementation (`atos/resolutions/RES-001-atos-v1-implementation.md`)

Constitutional layers (Specifications, Standards) become **Authoritative** only upon formal Founder approval of those documents. Presence in the repository does not equal constitutional authority.

---

## Governance Hierarchy

| Level | Role | Path |
|---|---|---|
| **1 — Specifications** | Constitution | `atos/specifications/` |
| **2 — Standards** | Organizational rules | `atos/standards/` |
| **3 — Operating Manuals** | Day-to-day execution | `atos/manuals/` |
| **4 — Reference Documents** | Knowledge & records | `atos/references/` |

Supporting systems:

| System | Path |
|---|---|
| Resolutions | `atos/resolutions/` |
| Governance frameworks | `atos/governance/` |
| Registries | `atos/registries/` |
| Schemas | `atos/schemas/` |
| History | `atos/history/` |
| Milestone records | `atos/milestones/` |

---

## Authority States (Anti-Hollow Rule)

Every governed document **must** declare one of:

| Status | Meaning | Loadable as institutional knowledge? |
|---|---|---|
| `Scaffold` | Placeholder structure only | **No** |
| `Draft` | Content under development | **No** (unless Founder explicitly authorizes interim use) |
| `Review` | Submitted for approval | **No** |
| `Authoritative` | Founder-approved governing truth | **Yes** |
| `Superseded` | Replaced by a newer version | Historical only |
| `Archived` | Retained for lineage | Historical only |

**Rule:** AI executives and runtime Context Injectors must not treat `Scaffold` or unapproved `Draft` documents as Canonical institutional knowledge.

---

## Quick Navigation

1. [Repository Governance](atos/governance/repository-governance.md)
2. [Authority Model](atos/governance/authority-model.md)
3. [Metadata Framework](atos/governance/metadata-framework.md)
4. [Registry Framework](atos/governance/registry-framework.md)
5. [ADR-0001 Repository Layout](atos/governance/ADR-0001-repository-layout.md)
6. [Pre-ATOS Compatibility](atos/governance/compatibility-atlas-pre-atos.md)
7. [ID Namespace Quarantine](atos/governance/id-namespace-quarantine.md)
8. [ATOS Registry](atos/registries/atos-registry.yaml)
9. [Repository Index](atos/registries/repository-index.yaml)
10. [RES-001](atos/resolutions/RES-001-atos-v1-implementation.md)

---

## Milestone Sequence (RES-001)

| Milestone | Focus | Status |
|---|---|---|
| M0 | Governance Foundation | Complete — awaiting Founder approval |
| M1 | Repository Organization | Pending |
| M2 | Registry Infrastructure | Pending |
| M3 | Metadata Framework (applied) | Pending |
| M4 | Knowledge Governance | Pending |
| M5 | Runtime Infrastructure | Pending |
| M6 | Executive Systems | Pending |
| M7 | Founder Workspace | Pending |
| M8 | Operational Validation | Pending |
| M9 | Version 1.0 Release | Pending |

---

## Agent Instructions

When operating on this repository:

1. Read this file and RES-001 before changing ATOS artifacts.
2. Obey Specifications and Standards once they are `Authoritative`.
3. Do not invent institutional knowledge.
4. Do not modify `atlas/` load paths without an approved compatibility/cutover plan.
5. Update registries when creating or modifying governed documents.
6. Stop at Founder approval gates between milestones.
