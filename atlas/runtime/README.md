# Atlas Target Runtime Plane

| Field | Value |
|---|---|
| **Document ID** | ATLAS-RT |
| **Contract** | ATLAS-P3 / RES-006 |
| **Decision** | ATLAS-D-W4 (no Founder-visible enablement yet) |
| **Plane** | Target (dual-plane with Legacy Ask Atlas) |
| **Loader** | Frozen — does not modify `atlas/engine/loader.ts` |

## Purpose

Executable modules realizing ATLAS-P2 infrastructure units as ATLAS-P3 `rt.*` roles.

## Flags

| Env var | Default | Meaning |
|---|---|---|
| `ATLAS_RUNTIME_TARGET` | off | Allow target pipeline execution (shadow/canary prep) |
| `ATLAS_RUNTIME_FOUNDER_VISIBLE` | off | Allow Founder delivery from target plane |

Per **ATLAS-D-W4**, do **not** enable these for Founder exposure until W4 evidence is accepted and the Founder issues a separate decision.

Legacy `/api/atlas` remains the production Founder path.

## Waves

| Wave | Status |
|---|---|
| W0–W3 | Implemented (Founder-visible off) |
| W4 Operational readiness | Evidence via `npm run atlas:runtime:check:w4` |
| W5+ | Pending separate Founder decisions |

## Checks

```bash
npm run atlas:runtime:check
npm run atlas:runtime:check:w4
```
