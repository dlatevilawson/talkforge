# Atlas Program — Implementation Waves Status

| Field | Value |
|---|---|
| **Document ID** | ATLAS-WAVES |
| **Version** | 0.1.0 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each implementation wave |
| **Dependencies** | ATLAS-P3, RES-006 |
| **Related Documents** | `atlas/runtime/README.md` |
| **Approval History** | 2026-07-19 — Opened with W0–W3 target plane |
| **Change Log** | 2026-07-19 — W0–W3 target plane landed; Founder-visible flag gated |

---

## Status

| Wave | Deliverable | Status | Notes |
|---|---|---|---|
| W0 | Module skeletons + envelopes + Trace stubs | **Done** | `atlas/runtime/**` |
| W1 | Ingress → Authority → fail-closed Trace | **Done** | Escalation path included |
| W2 | Knowledge → Context with label transport | **Done** | Parallel catalog; loader untouched |
| W3 | Cognition → Composition → Integrity | **Done (flagged)** | `ATLAS_RUNTIME_FOUNDER_VISIBLE` default off |
| W4 | Memory disposition + promo enqueue | Pending | Production retention Founder-gated |
| W5 | Exchange channels (Sentinel/domain) | Pending | Production exposure Founder-gated |
| W6 | Shadow dual-plane against Ask Atlas | Partial | Shadow metadata when `ATLAS_RUNTIME_TARGET=on` |
| W7 | Canary / primary cutover | Pending | Cutover gates in ATLAS-P3 Step 8 |
| W8 | Loader freeze lift | Pending | Explicit Founder approval required |

## Flags

- `ATLAS_RUNTIME_TARGET` — enable target pipeline / shadow  
- `ATLAS_RUNTIME_FOUNDER_VISIBLE` — Founder delivery from target (requires TARGET on)

## Verification

```bash
npm run atlas:runtime:check
npm run typecheck
npm run atos:check
```
