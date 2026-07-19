# Atlas Program — Implementation Waves Status

| Field | Value |
|---|---|
| **Document ID** | ATLAS-WAVES |
| **Version** | 0.4.0 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each implementation wave |
| **Dependencies** | ATLAS-P3, RES-006, ATLAS-D-W4, ATLAS-D-FLAGS, ATLAS-GATE-FV |
| **Related Documents** | `GATE-FOUNDER-VISIBLE.md`, `DECISION-RUNTIME-FLAGS.md`, `atlas/runtime/README.md` |
| **Approval History** | 2026-07-19 — W0–W5; ATLAS-GATE-FV criteria recorded |
| **Change Log** | 2026-07-19 — Founder-visible gate criteria + observation suite |

---

## Founder Decisions

| Decision | Stance |
|---|---|
| `ATLAS_RUNTIME_TARGET` | **Enabled** — active internal implementation |
| `ATLAS_RUNTIME_FOUNDER_VISIBLE` | **Disabled** — awaiting ATLAS-GATE-FV |

See [DECISION-RUNTIME-FLAGS.md](DECISION-RUNTIME-FLAGS.md) and [GATE-FOUNDER-VISIBLE.md](GATE-FOUNDER-VISIBLE.md).

---

## Next Founder Gate — Founder-visible runtime

Before enabling `ATLAS_RUNTIME_FOUNDER_VISIBLE`, observation must show:

1. Correct authority handling  
2. Correct escalation behavior  
3. Proper knowledge labeling  
4. No Canonical leakage  
5. Correct audit trails  
6. Stable recommendation quality  
7. No silent failures  
8. Repeatable behavior over time  

```bash
npm run atlas:runtime:observe
```

Evidence: `atlas/runtime/evidence/FOUNDER-VISIBLE-GATE-EVIDENCE.md`

Tooling PASS is necessary but not sufficient — Founder Decision still required to lift the flag.

---

## Status

| Wave | Deliverable | Status | Notes |
|---|---|---|---|
| W0–W3 | Target pipeline modules | **Done** | Integrity before any Founder delivery |
| W4 | Operational readiness proof | **Done** | ATLAS-D-W4 |
| W5 | Observation window (TARGET on) | **Active** | Gate suite: `atlas:runtime:observe` |
| W6 | Founder-visible enablement | Pending | ATLAS-GATE-FV + Founder Decision |
| W7 | Canary / primary cutover | Pending | Cutover gates + Founder approval |
| W8 | Loader freeze lift | Pending | Explicit Founder approval required |

## Verification

```bash
npm run atlas:runtime:check
npm run atlas:runtime:check:w4
npm run atlas:runtime:observe
npm run typecheck
npm run atos:check
```
