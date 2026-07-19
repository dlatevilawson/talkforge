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
| **Related Documents** | `atos/NAVIGATION.md`, `atos/RELEASE-1.0.0.md`, `atos/VERSION`, `atos/governance/GOV-MAINT-1.0.0.md` |
| **Approval History** | RES-001 authorized implementation; RES-002 ratified ATOS Version 1.0; Founder closed program / Maintenance Mode (2026-07-19) |
| **Change Log** | 2026-07-19 — Version 1.0 ratified; program CLOSED; Maintenance Mode |

---

## Program status

| Field | Value |
|---|---|
| **ATOS Program Status** | **CLOSED** |
| **Mode** | **Maintenance Mode** |
| **Version** | `1.0.0` — ratified (RES-002) |
| **Maintenance policy** | [`GOV-MAINT-1.0.0`](atos/governance/GOV-MAINT-1.0.0.md) |

Future changes to ATOS require the governance amendment process. **New work shall be built on ATOS rather than inside ATOS** unless a formal amendment is approved.

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
| **GOV-MAINT-1.0.0** | Program CLOSED · Maintenance Mode |

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

1. [Release 1.0.0](atos/RELEASE-1.0.0.md)  
2. [Maintenance Mode](atos/governance/GOV-MAINT-1.0.0.md)  
3. [Repository Navigation](atos/NAVIGATION.md)  
4. [RES-002](atos/resolutions/RES-002-atos-v1-ratification.md) · [RES-003 Atlas P0](atos/resolutions/RES-003-atlas-phase-0-design-contract.md) · [RES-004 Atlas P1](atos/resolutions/RES-004-atlas-phase-1-executive-architecture.md) · [RES-005 Atlas P2](atos/resolutions/RES-005-atlas-phase-2-executive-infrastructure.md)  
5. [Atlas P0](atos/executives/atlas-program/PHASE-0-DESIGN-CONTRACT.md) · [Atlas P1](atos/executives/atlas-program/PHASE-1-EXECUTIVE-ARCHITECTURE.md) · [Atlas P2](atos/executives/atlas-program/PHASE-2-EXECUTIVE-INFRASTRUCTURE.md) · [Atlas P3 Runtime](atos/executives/atlas-program/PHASE-3-RUNTIME-ARCHITECTURE.md)  
6. [Specifications](atos/specifications/README.md) (Authoritative)  
7. [Standards](atos/standards/README.md) (Authoritative)  
8. [Freeze Policy](atos/governance/GOV-FREEZE-1.0.0.md)  
9. [Document Registry](atos/registries/document-registry.yaml)  

---

## Milestone Sequence (RES-001) — Program CLOSED

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

**ATOS Program Status: CLOSED.** Maintenance Mode in effect.

---

## Agent Instructions

1. Read this file, RES-002, GOV-FREEZE-1.0.0, and GOV-MAINT-1.0.0 before changing ATOS artifacts.  
2. Obey Authoritative Specifications and Standards — they are constitutional law.  
3. Do not invent institutional knowledge.  
4. Do not modify `atlas/` load paths without Founder-gated cutover approval.  
5. Update registries when creating or modifying governed documents under an approved amendment.  
6. Pass `npm run atos:check` before completing ATOS structural changes.  
7. Obey GOV-FREEZE-1.0.0 — amend constitutional layers only through approved governance.  
8. Build new work **on** ATOS (product / executive operations); do not expand ATOS **inside** without a formal amendment.  
9. Do not open new ATOS implementation milestones unless the Founder authorizes an amendment or version program.  
10. Atlas Program must satisfy [`ATLAS-P0`](atos/executives/atlas-program/PHASE-0-DESIGN-CONTRACT.md) (RES-003), [`ATLAS-P1`](atos/executives/atlas-program/PHASE-1-EXECUTIVE-ARCHITECTURE.md) (RES-004), and [`ATLAS-P2`](atos/executives/atlas-program/PHASE-2-EXECUTIVE-INFRASTRUCTURE.md) (RES-005). If a design conflicts with Phase 0, Phase 1, or Phase 2, change the design — not the contracts.  
