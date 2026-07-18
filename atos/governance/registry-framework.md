# ATOS Registry Framework

| Field | Value |
|---|---|
| **Document ID** | GOV-REG |
| **Version** | 1.0.0-m0 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each milestone |
| **Dependencies** | RES-001, ADR-0001, GOV-META |
| **Related Documents** | `atos/registries/*`, `atos/schemas/registry-entry.schema.yaml` |
| **Approval History** | 2026-07-18 — M0 Draft |
| **Change Log** | 2026-07-18 — Initial registry framework |

---

## Purpose

Defines how ATOS discovers, indexes, and tracks organizational artifacts without requiring every planned document to exist as a file.

## Core registries (v1.0)

| Registry | File | Purpose |
|---|---|---|
| ATOS Registry | `atos/registries/atos-registry.yaml` | Master index of ATOS layers and systems |
| Document Registry | `atos/registries/document-registry.yaml` | All governed documents by ID |
| Knowledge Registry | `atos/registries/knowledge-registry.yaml` | Knowledge plane / promotion state |
| Executive Registry | `atos/registries/executive-registry.yaml` | Executive roles and status |
| Project Registry | `atos/registries/project-registry.yaml` | Projects (ATOS index; ops SoT finalized in later milestones) |
| Architecture Registry | `atos/registries/architecture-registry.yaml` | Architecture artifacts and ADRs |
| Repository Index | `atos/registries/repository-index.yaml` | Folder map and navigation |

## Entry states

| State | Meaning |
|---|---|
| `planned` | Approved to exist eventually; no file required |
| `scaffold` | Structural placeholder file exists |
| `draft` | Content in progress |
| `review` | Awaiting Founder/owner approval |
| `authoritative` | Approved governing artifact |
| `superseded` | Replaced |
| `archived` | Historical retention |

## Sync protocol

When a governed document is created or modified:

1. Update **Document Registry** (`id`, `path`, `status`, `version`, `owner`).
2. Update specialized registry if applicable (Knowledge, Executive, Project, Architecture).
3. Update **Repository Index** if folders changed.
4. Update **ATOS Registry** counts/status summaries when layer completeness changes.
5. Do this in the **same commit** as the document change.

## Completeness rule

Registry completeness means every **known ID** is listed — not that every ID has a file.

## M0 vs later milestones

| Milestone | Registry work |
|---|---|
| M0 | Framework + skeletal YAML registries |
| M2 | Populate and operationalize registry infrastructure |
| M4+ | Knowledge/ops registries gain promotion and SoT semantics |
