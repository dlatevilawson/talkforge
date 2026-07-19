# Atlas Program — Implementation Waves Status

| Field | Value |
|---|---|
| **Document ID** | ATLAS-WAVES |
| **Version** | 0.2.0 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each implementation wave |
| **Dependencies** | ATLAS-P3, RES-006, ATLAS-D-W4 |
| **Related Documents** | `atlas/runtime/README.md`, `DECISION-W4-OPERATIONAL-READINESS.md` |
| **Approval History** | 2026-07-19 — Opened with W0–W3; 2026-07-19 — ATLAS-D-W4 readiness decision |
| **Change Log** | 2026-07-19 — W4 reframed as operational readiness proof; flags remain off |

---

## Founder Decision (ATLAS-D-W4)

**Do not enable Founder-visible runtime yet.**

W4 must prove operational correctness — production retention, exchange exposure, and cutover readiness — before any visibility flag lift.

Enabling `ATLAS_RUNTIME_TARGET` and/or `ATLAS_RUNTIME_FOUNDER_VISIBLE` requires a **separate** Founder decision after W4 evidence is accepted.

See [DECISION-W4-OPERATIONAL-READINESS.md](DECISION-W4-OPERATIONAL-READINESS.md).

---

## Status

| Wave | Deliverable | Status | Notes |
|---|---|---|---|
| W0 | Module skeletons + envelopes + Trace stubs | **Done** | `atlas/runtime/**` |
| W1 | Ingress → Authority → fail-closed Trace | **Done** | Escalation path included |
| W2 | Knowledge → Context with label transport | **Done** | Parallel catalog; loader untouched |
| W3 | Cognition → Composition → Integrity | **Done (flagged)** | Founder-visible remains **off** |
| W4 | Operational readiness proof | **Done (evidence)** | Retention + exchange dry-run + cutover gates; flags **off** |
| W5 | Exchange production exposure | Pending | Only after separate Founder flag decision |
| W6 | Shadow dual-plane (TARGET on) | Pending | Separate Founder decision to enable TARGET |
| W7 | Canary / primary cutover | Pending | Cutover gates + Founder approval |
| W8 | Loader freeze lift | Pending | Explicit Founder approval required |

## Flags (current policy)

| Flag | Status | May enable when |
|---|---|---|
| `ATLAS_RUNTIME_TARGET` | **Off** | Separate Founder decision after W4 evidence |
| `ATLAS_RUNTIME_FOUNDER_VISIBLE` | **Off** | Separate Founder decision after W4 evidence |

## W4 evidence

```bash
npm run atlas:runtime:check:w4
```

Artifacts:

- `atlas/runtime/evidence/W4-READINESS-EVIDENCE.md`
- `atlas/runtime/evidence/w4-readiness.json`

## Verification

```bash
npm run atlas:runtime:check
npm run atlas:runtime:check:w4
npm run typecheck
npm run atos:check
```
