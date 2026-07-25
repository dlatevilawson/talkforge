# Legacy Atlas Engine → ATOS Runtime Mapping

| Field | Value |
|---|---|
| **Document ID** | RUNTIME-LEGACY |
| **Version** | 1.0.0-m5 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Sentinel |
| **Human Approver** | Founder |
| **Review Cycle** | Until cutover complete |
| **Dependencies** | GOV-COMPAT, GOV-RUNTIME, RUNTIME-IFACE |
| **Related Documents** | atlas/engine/*, RUNTIME-CTX |
| **Approval History** | 2026-07-18 — M5 Draft |
| **Change Log** | 2026-07-18 — Precursor mapping; no code cutover |

---

## Purpose

Map existing `atlas/engine` modules to ATOS runtime components without claiming they already are ATOS Runtime.

## Mapping

| ATOS component | Legacy precursor | Gap |
|---|---|---|
| Hub | `app/api/atlas/route.ts` + Founder OS page loaders | No unified Hub; product Forge coach is separate path |
| Context Injector | `loader.ts` + `prompt.ts` | Loads fixed Tier D set; no authority filter for ATOS Draft/Canonical |
| Memory Keeper | Partial notes/briefs via Supabase | No classification → promotion queue |
| Sandbox | None | Missing |
| Executive Routing | Implicit Atlas-only | No REG-EXEC selection |
| Workflow Engine | Ad hoc request handling | No STD-006 stage machine |
| Runtime State Manager | Request-scoped only | No shared runtime state model |
| Execution Logger | App/server logs | No R100x governed records |

## Cutover gates (Founder)

1. Context Injector implements RUNTIME-CTX authority filters.  
2. Canonical / Authoritative sources exist for domains being cut over.  
3. Memory Keeper can enqueue REG-PROMO-Q without auto-Canonicalizing.  
4. Explicit Founder approval to change `loadAtlasContext()` file set.  
5. Compatibility test: no silent authority upgrade of Draft Specs.
