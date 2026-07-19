# Atlas TalkForge Operating System (ATOS)

| Field | Value |
|---|---|
| **Document ID** | ATOS-ROOT |
| **Version** | 1.0.0 |
| **Status** | Authoritative |
| **Owner** | Founder |
| **AI Steward** | Atlas (Chief of Staff) |
| **Human Approver** | Founder |
| **Review Cycle** | Per ATOS version / on governance change |
| **Dependencies** | RES-001, RES-002 |
| **Related Documents** | `atos/NAVIGATION.md`, `atos/RELEASE-1.0.0.md`, `atos/VERSION` |
| **Approval History** | RES-001 authorized implementation; RES-002 ratified Specs/Standards; M9 package prepared; MS-SYNC governance state synchronized |
| **Change Log** | 2026-07-18 — M0–M9 package; 2026-07-19 — MS-SYNC state synchronization for Version 1.0 ratification readiness |

---

## Purpose

This file is the **canonical entrypoint** for humans and AI agents working with ATOS.

**Version:** `1.0.0` (see [`atos/VERSION`](atos/VERSION) and [`atos/RELEASE-1.0.0.md`](atos/RELEASE-1.0.0.md)).

ATOS is the organizational operating system for TalkForge. It is not the product application. Product code lives under `app/`, `lib/`, and related paths. Pre-ATOS knowledge remains under `atlas/` until migrated through Knowledge Governance (GOV-COMPAT).

---

## Authority

| Instrument | Role |
|---|---|
| **RES-001** | Implementation authorization for Version 1.0 |
| **RES-002** | Ratification of Specifications and Standards as Authoritative |
| **SPEC-001…006** | Authoritative constitutional layer |
| **STD-001…006** | Authoritative organizational rules |

Constitutional amendments and version releases remain Founder-exclusive.

---

## Governance Hierarchy

| Level | Role | Path | v1.0.0 state |
|---|---|---|---|
| **1 — Specifications** | Constitution | `atos/specifications/` | Authoritative |
| **2 — Standards** | Organizational rules | `atos/standards/` | Authoritative |
| **3 — Operating Manuals** | Day-to-day execution | `atos/manuals/` | Core Draft manuals |
| **4 — Reference Documents** | Knowledge & records | `atos/references/` | Sparse + templates |

Supporting systems: resolutions, governance, registries, schemas, knowledge, runtime, executives, founder, validation, history, milestones.

---

## Authority States (Anti-Hollow Rule)

| Status | Loadable as institutional/Canonical knowledge? |
|---|---|
| `Scaffold` | **No** |
| `Draft` | **No** (unless Founder explicitly authorizes interim use) |
| `Review` | **No** |
| `Authoritative` | **Yes** |
| `Superseded` / `Archived` | Historical only |

---

## Quick Navigation

1. [Release 1.0.0](atos/RELEASE-1.0.0.md) (Review — pending Founder ratification)
2. [Repository Navigation](atos/NAVIGATION.md)
3. [RES-001](atos/resolutions/RES-001-atos-v1-implementation.md) · [RES-002](atos/resolutions/RES-002-atos-v1-ratification.md)
4. [Specifications](atos/specifications/README.md) (Authoritative)
5. [Standards](atos/standards/README.md) (Authoritative)
6. [MVI Readiness](atos/validation/mvi-readiness.md)
7. [Freeze Policy](atos/governance/GOV-FREEZE-1.0.0.md) (Review — pending Founder ratification)
8. [Document Registry](atos/registries/document-registry.yaml)
9. [MS-SYNC](atos/milestones/MS-SYNC-governance-state.md)

---

## Milestone Sequence (RES-001)

| Milestone | Focus | Status |
|---|---|---|
| M0 | Governance Foundation | Complete — Founder approved |
| M1 | Repository Organization | Complete — Founder approved |
| M2 | Registry Infrastructure | Complete — Founder approved |
| M3 | Metadata Framework | Complete — Founder approved |
| M4 | Knowledge Governance | Complete — Founder approved |
| M5 | Runtime Infrastructure | Complete — Founder approved |
| M6 | Executive Systems | Complete — Founder approved |
| M7 | Founder Workspace | Complete — Founder approved |
| M8 | Operational Validation | Complete — Founder approved |
| M9 | Version 1.0 Release | Package prepared — awaiting Founder ratification |
| MS-SYNC | Governance State Synchronization | Complete — awaiting Founder acceptance of Final FAR |

---

## Agent Instructions

1. Read this file, RES-001, and RES-002 before changing ATOS artifacts.  
2. Obey Authoritative Specifications and Standards.  
3. Do not invent institutional knowledge.  
4. Do not modify `atlas/` load paths without Founder-gated cutover approval.  
5. Update registries when creating or modifying governed documents.  
6. Pass `npm run atos:check` before completing ATOS structural changes.  
7. Treat GOV-FREEZE-1.0.0 as Review until Founder Version 1.0 ratification; Specs/Standards remain Authoritative per RES-002.  
