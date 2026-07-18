# ATOS Runtime Governance

| Field | Value |
|---|---|
| **Document ID** | GOV-RUNTIME |
| **Version** | 1.0.0-m5 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Sentinel |
| **Human Approver** | Founder |
| **Review Cycle** | Each milestone |
| **Dependencies** | SPEC-005, STD-006, GOV-KNOW, GOV-COMPAT, RES-001 |
| **Related Documents** | MAN-013, atos/runtime/*, REG-RUNTIME |
| **Approval History** | 2026-07-18 — M5 Draft |
| **Change Log** | 2026-07-18 — Runtime governance for interface definition phase |

---

## Purpose

Governs how Runtime Infrastructure is defined and operated within ATOS. Runtime executes work; it does not establish organizational authority.

## M5 scope

**In scope:** Interface definitions, context framework, memory classification, workflow documentation, mapping of legacy Atlas engine to future ATOS runtime components.

**Out of scope:** Changing Ask Atlas loaders; implementing Hub code; writing high-volume runtime logs into git; Founder-gated cutover from `atlas/` to ATOS Canonical context.

## Principles

1. Runtime executes but does not govern (SPEC-005).
2. Context shall be minimal, relevant, and governed (STD-006).
3. Memory classification precedes storage and promotion (GOV-KNOW).
4. Sandbox outputs are proposals only.
5. Documentation before automation.
6. Storage planes: governance in git; high-volume logs non-git (ADR-0001).

## Legacy precursor

Current `atlas/engine/*` is a **pre-ATOS runtime precursor**, not the ATOS Hub. Mapping is documented in `atos/runtime/legacy-mapping.md`. Cutover requires Founder approval.
