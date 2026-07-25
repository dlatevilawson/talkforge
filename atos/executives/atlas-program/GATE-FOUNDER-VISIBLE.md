# Founder Gate — Founder-Visible Runtime

| Field | Value |
|---|---|
| **Document ID** | ATLAS-GATE-FV |
| **Version** | 1.0.0 |
| **Status** | Authoritative |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Until FOUNDER_VISIBLE Decision |
| **Dependencies** | ATLAS-D-FLAGS, ATLAS-D-W4, ATLAS-P3, RES-006 |
| **Related Documents** | `IMPLEMENTATION-WAVES.md`, `atlas/runtime/observation/` |
| **Approval History** | 2026-07-19 — Founder defined gate criteria for FOUNDER_VISIBLE |
| **Change Log** | 2026-07-19 — Initial Founder Gate criteria recorded |

---

## Gate

The only major gate remaining before Atlas enters daily Founder workflow:

**Enable `ATLAS_RUNTIME_FOUNDER_VISIBLE`**

Until this gate is passed and the Founder issues an explicit Decision, Founder-visible delivery remains **off**. Legacy Ask Atlas continues to serve executive responses.

---

## Required evidence (observation window)

Before lifting the flag, the target runtime must consistently demonstrate:

| ID | Criterion |
|---|---|
| FV-1 | Correct authority handling |
| FV-2 | Correct escalation behavior |
| FV-3 | Proper knowledge labeling |
| FV-4 | No Canonical leakage |
| FV-5 | Correct audit trails |
| FV-6 | Stable recommendation quality |
| FV-7 | No silent failures |
| FV-8 | Repeatable behavior over time |

If these hold through the observation window, enabling `ATLAS_RUNTIME_FOUNDER_VISIBLE` becomes much lower risk.

---

## Evidence method

Automated observation suite:

```bash
npm run atlas:runtime:observe
```

Produces:

- `atlas/runtime/evidence/FOUNDER-VISIBLE-GATE-EVIDENCE.md`
- `atlas/runtime/evidence/founder-visible-gate.json`

**Pass rule for tooling:** all FV-1…FV-8 checks pass across the suite iterations with `ATLAS_RUNTIME_FOUNDER_VISIBLE` still off.

**Founder rule:** tooling PASS is necessary but not sufficient — Founder still issues the Decision to enable the flag.

---

## Binding rules

1. Do not enable `ATLAS_RUNTIME_FOUNDER_VISIBLE` without Founder Decision after reviewing gate evidence.  
2. Observation suite must run with TARGET on and FOUNDER_VISIBLE off.  
3. Failures in any FV criterion block a recommendation to lift the gate.  
4. Loader freeze and Phase 0–3 contracts remain in force.  

---

## Declaration

| Field | Value |
|---|---|
| **Defined By** | Founder |
| **Date** | 2026-07-19 |
| **Status Upon Signature** | Authoritative |
