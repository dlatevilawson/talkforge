# Atlas Target Runtime Plane

| Field | Value |
|---|---|
| **Document ID** | ATLAS-RT |
| **Contract** | ATLAS-P3 / RES-006 |
| **Plane** | Target (dual-plane with Legacy Ask Atlas) |
| **Loader** | Frozen — does not modify `atlas/engine/loader.ts` |

## Purpose

Executable modules realizing ATLAS-P2 infrastructure units as ATLAS-P3 `rt.*` roles.

## Flags

| Env var | Default | Meaning |
|---|---|---|
| `ATLAS_RUNTIME_TARGET` | off | Allow target pipeline execution (shadow/canary prep) |
| `ATLAS_RUNTIME_FOUNDER_VISIBLE` | off | Allow Founder delivery from target plane (W3 Founder gate) |

Legacy `/api/atlas` remains the production path until Founder enables cutover flags.

## Waves

| Wave | Status |
|---|---|
| W0 Module skeletons + envelopes + Trace | Implemented |
| W1 Ingress → Authority → Trace | Implemented |
| W2 Knowledge → Context (labeled) | Implemented |
| W3 Cognition → Composition → Integrity | Implemented (Founder-visible behind flag) |
| W4+ | Pending Founder gates |

## Check

```bash
npm run atlas:runtime:check
```
