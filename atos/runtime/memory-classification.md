# Memory Classification

| Field | Value |
|---|---|
| **Document ID** | RUNTIME-MEM |
| **Version** | 1.0.0-m5 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each milestone |
| **Dependencies** | SPEC-005, STD-006, GOV-KNOW, STD-002 |
| **Related Documents** | RUNTIME-IFACE, REG-PROMO-Q |
| **Approval History** | 2026-07-18 — M5 Draft |
| **Change Log** | 2026-07-18 — Memory classes and disposition rules |

---

## Purpose

Defines how Memory Keeper classifies execution outcomes **before** storage (STD-006).

## Classes

| Class | Meaning | Disposition |
|---|---|---|
| **Temporary Memory** | Needed only for the active workflow | Ephemeral runtime state; TTL discard |
| **Operational Memory** | Affects live ops (projects, incidents, metrics) | Operational registries / ops plane; not Canonical |
| **Promotion Candidate** | May become institutional knowledge | Enqueue via REF-R1110 + REG-PROMO-Q |
| **Discarded Information** | No retention value | Explicit discard; optional audit crumb |

## Classification rules

1. Classification precedes storage.
2. Promotion Candidate ≠ Canonical. Pipeline + Founder institutional approval required.
3. Sandbox proposals default to Temporary or Promotion Candidate (never Canonical).
4. Operational Memory must not silently overwrite Identity or Canonical domains.
5. When unsure, classify Temporary and escalate — do not invent institutional facts.

## Mapping to knowledge stores

| Class | ATOS store / sink |
|---|---|
| Temporary | Runtime state (non-git) |
| Operational | Ops registries / legacy ops plane as applicable |
| Promotion Candidate | `atos/knowledge/promotion/` + evidence |
| Discarded | No durable store (logger may note discard) |
