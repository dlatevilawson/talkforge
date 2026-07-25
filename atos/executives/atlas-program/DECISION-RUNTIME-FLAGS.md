# Founder Decision — Runtime Flags (TARGET Enablement)

| Field | Value |
|---|---|
| **Document ID** | ATLAS-D-FLAGS |
| **Version** | 1.0.0 |
| **Status** | Authoritative |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Until superseded by Founder Decision |
| **Dependencies** | ATLAS-P3, RES-006, ATLAS-D-W4 |
| **Related Documents** | `IMPLEMENTATION-WAVES.md`, `atlas/runtime/flags.ts` |
| **Approval History** | 2026-07-19 — Founder Decision on Runtime Flags |
| **Change Log** | 2026-07-19 — TARGET authorized on; FOUNDER_VISIBLE remains off |

---

## Decision

### Enable — `ATLAS_RUNTIME_TARGET`

Authorized. The target runtime is the **active internal implementation**.

It must run on Atlas requests for Trace, Integrity, retention, and exchange observation — while Legacy Ask Atlas continues to serve Founder-visible responses.

### Keep disabled — `ATLAS_RUNTIME_FOUNDER_VISIBLE`

Founder-visible delivery from the target plane remains **off**.

This creates a final **observation window**: evidence that Atlas performs correctly in the target runtime under normal operational use, before exposing it directly to executive workflows.

### Binding rules

1. TARGET is on by default (authorized). Explicit `off` / `0` / `false` may disable only for emergency rollback.  
2. FOUNDER_VISIBLE remains opt-in and requires a further Founder Decision after observation evidence.  
3. Loader freeze remains until an explicit later cutover decision (W8).  
4. Observation ≠ Founder exposure. Shadow/internal target results must not replace Legacy Founder responses while FOUNDER_VISIBLE is off.  

---

## Declaration

| Field | Value |
|---|---|
| **Approved By** | Founder |
| **Approval Date** | 2026-07-19 |
| **Status Upon Signature** | Authoritative |
