# Atlas Program — Implementation Waves Status

| Field | Value |
|---|---|
| **Document ID** | ATLAS-WAVES |
| **Version** | 0.3.0 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each implementation wave |
| **Dependencies** | ATLAS-P3, RES-006, ATLAS-D-W4, ATLAS-D-FLAGS |
| **Related Documents** | `atlas/runtime/README.md`, `DECISION-W4-OPERATIONAL-READINESS.md`, `DECISION-RUNTIME-FLAGS.md` |
| **Approval History** | 2026-07-19 — W0–W4; ATLAS-D-FLAGS TARGET enablement |
| **Change Log** | 2026-07-19 — TARGET authorized on; FOUNDER_VISIBLE off (observation window) |

---

## Founder Decisions

### ATLAS-D-FLAGS (current)

| Flag | Stance |
|---|---|
| `ATLAS_RUNTIME_TARGET` | **Enabled** — active internal implementation |
| `ATLAS_RUNTIME_FOUNDER_VISIBLE` | **Disabled** — observation window before executive exposure |

See [DECISION-RUNTIME-FLAGS.md](DECISION-RUNTIME-FLAGS.md).

### Observation window

Target runtime runs on every Ask Atlas request for internal Trace/Integrity/retention observation.  
Legacy Ask Atlas continues to serve Founder-visible responses until a further Founder Decision enables `ATLAS_RUNTIME_FOUNDER_VISIBLE`.

---

## Status

| Wave | Deliverable | Status | Notes |
|---|---|---|---|
| W0–W3 | Target pipeline modules | **Done** | Integrity before any Founder delivery |
| W4 | Operational readiness proof | **Done** | Evidence under ATLAS-D-W4 |
| W5 | Observation window (TARGET on) | **Active** | Internal target; FOUNDER_VISIBLE off |
| W6 | Founder-visible enablement | Pending | Requires further Founder Decision + observation evidence |
| W7 | Canary / primary cutover | Pending | Cutover gates + Founder approval |
| W8 | Loader freeze lift | Pending | Explicit Founder approval required |

## Flags (authorized defaults)

| Flag | Default | Override |
|---|---|---|
| `ATLAS_RUNTIME_TARGET` | **on** (authorized) | `off` / `0` / `false` emergency rollback only |
| `ATLAS_RUNTIME_FOUNDER_VISIBLE` | **off** | Explicit `on` only after Founder Decision |

## Verification

```bash
npm run atlas:runtime:check
npm run atlas:runtime:check:w4
npm run typecheck
npm run atos:check
```
