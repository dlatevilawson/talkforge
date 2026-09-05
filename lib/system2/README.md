# System 2 — Contracts (remediation stub)

Authorized by SYS2-001 / BUILD-SYS2 / AUDIT-001 remediation.

| Module | Role |
|---|---|
| `types.ts` | Readiness + Adaptive Homepage contracts |
| `home-copy.ts` | Coach homepage copy |
| `home-recommendation.ts` | One recommendation + secondary alternatives |
| `index.ts` | Public exports |

## Rules

1. Homepage and coaching entry **must** call `buildAdaptiveHome` / `evaluateReadiness` / `recommendNextStep`.
2. Do not present equal multi-mission menus as readiness.
3. Experiences never write Living Profile identity (Forge Law #016).
4. Readiness may **recommend, rank, narrow** — never invent identity or store a second profile.
5. Pending provenance is labeled `pending_evidence` and is not identity.
