# ATOS Registry Operations

| Field | Value |
|---|---|
| **Document ID** | GOV-REGOPS |
| **Version** | 1.0.0-m2 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each milestone |
| **Dependencies** | GOV-REG, GOV-META, RES-001 |
| **Related Documents** | `atos/registries/*`, SCRIPT-ATOS-M2 |
| **Approval History** | 2026-07-18 — M2 Draft |
| **Change Log** | 2026-07-18 — Operational procedures for core registries |

---

## Purpose

Defines day-to-day operation of the four RES-001 M2 core registries so they remain the discoverable index of ATOS.

## Core registries (M2)

| Registry | ID | File | System of record for |
|---|---|---|---|
| ATOS Registry | REG-ATOS | `atos-registry.yaml` | Layer/system completeness and milestone pointer |
| Document Registry | REG-DOC | `document-registry.yaml` | Every governed document ID → path/state |
| Executive Registry | REG-EXEC | `executive-registry.yaml` | Executive roles, status, delegated authority |
| Project Registry | REG-PROJ | `project-registry.yaml` | ATOS-recognized projects and owners |

Supporting registries (Knowledge, Architecture, Repository Index) remain active but are not the M2 success focus.

## Operating rules

1. **Document Registry is mandatory.** No governed ATOS markdown/YAML artifact may exist without a `REG-DOC` entry.
2. **Paths must resolve.** If `path` is non-null, the file must exist.
3. **Planned-only entries** use `path: null` and `state: planned`.
4. **ATOS Registry summarizes** Document Registry — do not invent layer counts that contradict REG-DOC.
5. **Executive Registry** is the authority list for roles; manuals/charters may be `planned`.
6. **Project Registry** is the ATOS project index. Legacy `atlas/projects.md` is a **legacy source**, not a second authority. Operational SoT consolidation continues in later milestones; until then REG-PROJ is the ATOS-facing index and must not silently diverge on ATOS project IDs.
7. **Same-commit sync** remains required (see GOV-REG).
8. **Validation:** `npm run atos:check:m2` must pass before closing registry-related work.

## Create / update / archive

### Create document

1. Assign Document ID per naming rules (GOV-REPO).
2. Write file with metadata table.
3. Add/update REG-DOC entry.
4. Update REG-ATOS counts if layer membership changes.
5. Update REG-EXEC / REG-PROJ / Architecture if applicable.
6. Update NAVIGATION or Repository Index if discoverability changes.

### Update document

1. Edit file + Change Log.
2. Bump `version` when material.
3. Sync REG-DOC `version` / `state`.

### Archive / supersede

1. Set document Status to `Superseded` or `Archived`.
2. Move prior version to `atos/history/` when replacing Authoritative constitutional text.
3. Update REG-DOC state; keep ID stable.

## Integrity invariants

| Invariant | Check |
|---|---|
| Unique document IDs | No duplicate `id` in REG-DOC |
| Unique executive IDs | No duplicate `id` in REG-EXEC |
| Unique project IDs | No duplicate `id` in REG-PROJ |
| Path integrity | Non-null paths exist |
| Metadata IDs | File `Document ID` matches REG-DOC `id` when both present |
| Milestone pointer | REG-ATOS `milestones.current` matches active work |

## Out of scope for M2

- Knowledge promotion queue semantics (M4)
- Runtime log registries (storage-plane ADR)
- Rewriting Ask Atlas loaders
- Deleting legacy `atlas/projects.md` (deferred until ops SoT decision)
