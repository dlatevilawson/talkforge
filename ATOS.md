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
| **Approval History** | RES-001 authorized implementation; RES-002 ratified ATOS Version 1.0 (2026-07-19) |
| **Change Log** | 2026-07-19 — Version 1.0 ratified; ATOS implementation project complete |

---

## Purpose

This file is the **canonical entrypoint** for humans and AI agents working with ATOS.

**Version:** `1.0.0` — **ratified** (see [`atos/VERSION`](atos/VERSION), [`atos/RELEASE-1.0.0.md`](atos/RELEASE-1.0.0.md), [`RES-002`](atos/resolutions/RES-002-atos-v1-ratification.md)).

ATOS is the constitution of TalkForge — the governing organizational operating system. It is not the product application. Product code lives under `app/`, `lib/`, and related paths. Pre-ATOS knowledge remains under `atlas/` until migrated through Knowledge Governance (GOV-COMPAT).

---

## Standing order (RES-002)

| Role | Standing |
|---|---|
| **ATOS** | The constitution |
| **Atlas** | The government operating under that constitution |
| **Sentinel** | Protects implementation |
| **TalkForge** | The product built on top of both |

---

## Authority

| Instrument | Role |
|---|---|
| **RES-001** | Implementation authorization for Version 1.0 (historical) |
| **RES-002** | Founder ratification of ATOS Version 1.0 |
| **SPEC-001…006** | Constitutional documents |
| **STD-001…006** | Official governance rules |
| **GOV-FREEZE-1.0.0** | Freeze — amendments only via approved process |

Constitutional amendments and version releases remain Founder-exclusive. Future development occurs within ATOS, not by rewriting it.

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

1. [Release 1.0.0](atos/RELEASE-1.0.0.md)  
2. [Repository Navigation](atos/NAVIGATION.md)  
3. [RES-002 — Ratification](atos/resolutions/RES-002-atos-v1-ratification.md) · [RES-001](atos/resolutions/RES-001-atos-v1-implementation.md)  
4. [Specifications](atos/specifications/README.md) (Authoritative)  
5. [Standards](atos/standards/README.md) (Authoritative)  
6. [Freeze Policy](atos/governance/GOV-FREEZE-1.0.0.md)  
7. [Document Registry](atos/registries/document-registry.yaml)  

---

## Milestone Sequence (RES-001) — Project Complete

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
| M9 | Version 1.0 Release | Complete — Founder ratified |
| MS-SYNC | Governance State Synchronization | Complete — Founder ratified |

**The ATOS Version 1.0 implementation project is complete.**

---

## Agent Instructions

1. Read this file and RES-002 before changing ATOS artifacts.  
2. Obey Authoritative Specifications and Standards — they are constitutional law.  
3. Do not invent institutional knowledge.  
4. Do not modify `atlas/` load paths without Founder-gated cutover approval.  
5. Update registries when creating or modifying governed documents.  
6. Pass `npm run atos:check` before completing ATOS structural changes.  
7. Obey GOV-FREEZE-1.0.0 — amend constitutional layers only through approved governance.  
8. Operate within ATOS; do not rewrite the constitution.  
