# Registry Index

| Field | Value |
|---|---|
| **Document ID** | REG-INDEX |
| **Version** | 1.0.0-m2 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Dependencies** | GOV-REGOPS, RES-001 |
| **Related Documents** | All `*.yaml` in this directory |
| **Approval History** | 2026-07-18 — M2 |
| **Change Log** | 2026-07-18 — Human index for registry infrastructure |

## Core (RES-001 M2)

| Registry | File | Role |
|---|---|---|
| ATOS Registry | [atos-registry.yaml](atos-registry.yaml) | Master layer/system index |
| Document Registry | [document-registry.yaml](document-registry.yaml) | All governed documents |
| Executive Registry | [executive-registry.yaml](executive-registry.yaml) | Executives & authority |
| Project Registry | [project-registry.yaml](project-registry.yaml) | Projects index |

## Supporting

| Registry | File |
|---|---|
| Knowledge Registry | [knowledge-registry.yaml](knowledge-registry.yaml) |
| Architecture Registry | [architecture-registry.yaml](architecture-registry.yaml) |
| Repository Index | [repository-index.yaml](repository-index.yaml) |

## Operations

See [../governance/registry-operations.md](../governance/registry-operations.md).

Validate with `npm run atos:check:m2`.
