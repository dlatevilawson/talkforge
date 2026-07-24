# Atlas Target Runtime Plane

| Field | Value |
|---|---|
| **Document ID** | ATLAS-RT |
| **Contract** | ATLAS-P3 / RES-006 |
| **Decisions** | ATLAS-D-W4 · ATLAS-D-FLAGS |
| **Plane** | Target = active internal; Legacy = Founder-visible surface |
| **Loader** | Frozen — does not modify `atlas/engine/loader.ts` |

## Flags (ATLAS-D-FLAGS)

| Env var | Authorized default | Meaning |
|---|---|---|
| `ATLAS_RUNTIME_TARGET` | **on** | Active internal implementation (observation on each request) |
| `ATLAS_RUNTIME_FOUNDER_VISIBLE` | **off** | Founder delivery from target — disabled during observation window |

Set `ATLAS_RUNTIME_TARGET=off` only for emergency rollback.  
Do not set `ATLAS_RUNTIME_FOUNDER_VISIBLE=on` without a further Founder Decision.

## Observation window

While TARGET is on and FOUNDER_VISIBLE is off:

1. `/api/atlas` runs the target pipeline internally (`observation` metadata).  
2. Founder-visible `response` still comes from Legacy Ask Atlas.  
3. Collect evidence that target Integrity/retention/exchange behave under normal use.  

## Founder-visible gate (ATLAS-GATE-FV)

Observation suite for the next Founder Gate (does **not** enable FOUNDER_VISIBLE):

```bash
npm run atlas:runtime:observe
```

## Staff organization (ATLAS-P6)

Living AIO offices: [`staff/`](staff/) — coordination layer, office packs, delegation metrics.

```bash
npm run atlas:staff:check
```

## Checks

```bash
npm run atlas:runtime:check
npm run atlas:runtime:check:w4
npm run atlas:runtime:observe
npm run atlas:staff:check
```
