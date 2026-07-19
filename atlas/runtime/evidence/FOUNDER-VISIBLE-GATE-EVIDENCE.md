# Founder-Visible Gate Evidence

Generated: 2026-07-19T13:27:48.665Z  
Gate: **ATLAS-GATE-FV**  
Iterations: 3

## Flag posture (must hold)

| Flag | Value |
|---|---|
| ATLAS_RUNTIME_TARGET | `true` |
| ATLAS_RUNTIME_FOUNDER_VISIBLE | `false` |
| Observation window | `true` |

## Criteria

| ID | Criterion | Result | Notes |
|---|---|---|---|
| FV-1 | Correct authority handling | **PASS** | S1: authority=pass; S2: authority=pass |
| FV-2 | Correct escalation behavior | **PASS** | S3: escalate→artifact→Integrity=STOP; delivery suppressed; S4: escalate→artifact→Integrity=STOP; delivery suppressed |
| FV-3 | Proper knowledge labeling | **PASS** | S1: 11 items labeled; planes=legacy-atlas,ops; S2: 11 items labeled; planes=legacy-atlas,ops |
| FV-4 | No Canonical leakage | **PASS** | S1: audit=11 all non-Canonical; disposition=temporary; S2: audit=11 all non-Canonical; disposition=temporary |
| FV-5 | Correct audit trails | **PASS** | S1: full flow audited; S2: full flow audited |
| FV-6 | Stable recommendation quality | **PASS** | S1: type=standard binding=false confidence=medium validation=PASS; S2: type=standard binding=false confidence=medium validation=PASS |
| FV-7 | No silent failures | **PASS** | S1: success explicit (ok + PASS); S2: success explicit (ok + PASS) |
| FV-8 | Repeatable behavior over time | **PASS** | S1: identical behavior fingerprint across 3 iterations (b1b1157071c6…); S2: identical behavior fingerprint across 3 iterations (b1b1157071c6…) |

## Recommendation to Founder

`evidence_supports_founder_decision`

- `evidence_supports_founder_decision` — tooling PASS; Founder may still decline or delay.  
- `do_not_enable_founder_visible` — do not lift the flag; remediate failures first.

**FOUNDER_VISIBLE remains off until an explicit Founder Decision.**

Machine-readable: `atlas/runtime/evidence/founder-visible-gate.json`
