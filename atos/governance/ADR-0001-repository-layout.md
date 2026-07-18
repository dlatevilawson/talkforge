# ADR-0001 — ATOS Repository Layout

| Field | Value |
|---|---|
| **Document ID** | ADR-0001 |
| **Version** | 1.0.0 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Sentinel |
| **Human Approver** | Founder |
| **Review Cycle** | On layout change |
| **Dependencies** | RES-001, Spec 001 (when Authoritative) |
| **Related Documents** | `repository-governance.md`, `registry-framework.md` |
| **Approval History** | 2026-07-18 — Created in M0 for implementation guidance (Draft until Founder marks Authoritative) |
| **Change Log** | 2026-07-18 — Initial layout decision for ATOS v1.0 |

---

## Problem

TalkForge needs a durable place for organizational governance that does not collide with product code, and that can scale for 5–10 years without forcing all operational telemetry into git.

## Context

- Pre-ATOS knowledge lives in flat `atlas/*.md` files loaded by Ask Atlas.
- ATOS Levels 1–4 were designed and authorized via RES-001.
- ARB warned against hollow mass file creation and unbounded git logs.

## Decision

1. **ATOS root:** `/atos/` for all ATOS governance artifacts; `/ATOS.md` as entrypoint.
2. **Product root unchanged:** `app/`, `lib/`, `supabase/`, `public/` remain the product application.
3. **Pre-ATOS freeze:** `atlas/` remains the live Ask Atlas corpus until an approved cutover (see compatibility document). No silent replacement in M0.
4. **Sparse tree:** Create level directories and registries first. Do not pre-create empty files for every Reference ID.
5. **Storage planes:**
   - **Git-canonical:** Specifications, Standards, Manuals, foundational references, templates, registries, ADRs, resolutions, historical governance versions.
   - **Non-git (future):** High-volume runtime logs (R1001–R1006), ephemeral workflow telemetry — registry records their existence; storage backend decided before Runtime Track implementation.
6. **IDs:** Stable document IDs (`SPEC-001`, `STD-001`, `MAN-001`, `REF-R001`, `RES-001`, `ADR-0001`) independent of file path.
7. **Machine registries:** YAML under `atos/registries/` is the machine-readable index; markdown may mirror for humans.

## Alternatives Considered

| Alternative | Why rejected |
|---|---|
| Store ATOS inside `atlas/` | Collides with live loader corpus; muddies migration |
| Separate git repository | Premature split for founding stage; hurts atomic PRs |
| Create all R001–R1208 files now | Hollow governance; agent confusion |

## Consequences

- M0–M3 can proceed without touching product runtime.
- Migration of `atlas/` content requires Knowledge Governance (M4+) and loader compatibility work (Founder-gated).
- Runtime log lakes must not be bolted into git later without amending this ADR.

## Rollback

Remove `/atos/` and `/ATOS.md` if M0 is rejected; `atlas/` and product code remain unchanged.
