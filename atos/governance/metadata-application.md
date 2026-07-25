# ATOS Metadata Application (M3)

| Field | Value |
|---|---|
| **Document ID** | GOV-META-APP |
| **Version** | 1.0.0-m3 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each milestone |
| **Dependencies** | GOV-META, GOV-AUTH, GOV-REGOPS, RES-001 |
| **Related Documents** | REF-R1100, SCH-META-001, REG-DOC |
| **Approval History** | 2026-07-18 — M3 Draft |
| **Change Log** | 2026-07-18 — Metadata application rules for Version 1.0 |

---

## Purpose

Applies the Metadata Framework across all governed ATOS artifacts created through M2, and defines ongoing enforcement for M3+.

## Ownership matrix (default)

| Artifact class | Owner | AI Steward | Human Approver |
|---|---|---|---|
| Resolutions | Founder | Atlas | Founder |
| Specifications | Founder | Atlas (Sentinel for SPEC-005) | Founder |
| Standards | Founder | Atlas (Sentinel for STD-005) | Founder |
| Governance frameworks | Founder | Atlas | Founder |
| Registries | Founder | Atlas | Founder |
| Milestone records | Founder | Atlas | Founder |
| Engineering-facing schemas/scripts | Founder | Sentinel | Founder |
| Core manuals (when created) | Founder | Domain executive | Founder |

## Versioning rules

1. Use `major.minor.patch` or `major.minor.patch-mN` during milestone delivery.
2. **Major** — incompatible constitutional change (Founder approval required).
3. **Minor** — material content change.
4. **Patch** — typo, formatting, non-semantic metadata clarification.
5. Registry YAML `version` fields should track registry schema/content generations (`1.0.0-mN`).

## Review cycles

| Class | Default review cycle |
|---|---|
| Specs / Standards | On constitutional amendment |
| Governance ops docs | Each milestone |
| Registries | Each milestone / on structural change |
| Milestone records | On milestone close |
| Templates | When consuming Standard changes |

## Approval history & change log

1. **Approval History** is append-only. Record Founder/owner decisions with dates.
2. **Change Log** is append-only. Record material edits with dates.
3. Do not rewrite history; supersede documents instead when replacing Authoritative text.

## YAML / machine artifacts

Machine registries and schemas use comment headers:

```yaml
# Document ID: <ID>
# Version: <version>
# Status: Draft
# Owner: Founder
# AI Steward: Atlas
# Human Approver: Founder
# Review Cycle: Each milestone
# Approval History: <event>
# Change Log: <event>
```

## Enforcement

- Markdown governed docs: all eleven metadata fields required (`npm run atos:check:m3`).
- YAML registries/schemas: nine header fields required.
- Document Registry must list Owner and AI Steward for every entry with a path.

## M3 completion criteria

1. GOV-META and GOV-META-APP published.
2. Metadata template available (`REF-R1100`).
3. All governed markdown docs pass field completeness.
4. All registry/schema YAML headers complete.
5. `atos:check:m3` passes.
