# Atlas Internal Staff (living organization)

**Contracts:** ATLAS-P5 · ATLAS-P6 · ATLAS-ENG-PROGRAM  
**Plane:** Target runtime only · Loader frozen · FOUNDER_VISIBLE off by default

This directory **is** the organization — executable AIO offices, not a document shelf.

| Path | Role |
|---|---|
| `offices/packs.ts` | Operating charter + prompts + standards + metrics per AIO |
| `coordinate.ts` | Coordination layer — Core delegates via `task_assigned` |
| `intel.ts` … `guard.ts` | Office facades over `rt.*` |
| `bus.ts` / `events.ts` | In-process event contracts |
| `program.ts` | AIF-PROGRAM (Program Desk) under Core |
| `metrics.ts` | Delegation effectiveness |
| `check.ts` | `npm run atlas:staff:check` |

```bash
npm run atlas:staff:check
```
