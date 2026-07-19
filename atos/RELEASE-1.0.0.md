# ATOS Version 1.0.0 — Release Notes

| Field | Value |
|---|---|
| **Document ID** | ATOS-RELEASE-1.0.0 |
| **Version** | 1.0.0 |
| **Status** | Review |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | On next ATOS version |
| **Dependencies** | RES-001, RES-002, VAL-MVI, MS-SYNC |
| **Related Documents** | ATOS.md, GOV-FREEZE-1.0.0, MS-M9, MS-SYNC |
| **Approval History** | 2026-07-18 — M9 package prepared; 2026-07-19 — Status → Review (awaiting Founder Version 1.0 ratification) |
| **Change Log** | 2026-07-19 — MS-SYNC: pending-ratification publication state |

---

## Publication status

**Atlas TalkForge Operating System (ATOS) Version 1.0.0** is prepared for Founder ratification as the governing organizational operating system documentation for TalkForge.

| Item | Value |
|---|---|
| Version | 1.0.0 |
| Authorization | RES-001 |
| Spec/Standard ratification instrument | RES-002 |
| Entrypoint | [`/ATOS.md`](../ATOS.md) |
| Proposed git tag | `atos-v1.0.0` |
| Validation | `npm run atos:check` (M0–M9 + sync integrity) |
| Package status | **Review** — effective upon Founder ratification |

## What Version 1.0 includes

- Level 1 Specifications (Authoritative via RES-002)  
- Level 2 Standards (Authoritative via RES-002)  
- Core Operating Manuals (Founder, Atlas, Sentinel, Runtime, AIEM, Founder Intelligence) — Draft  
- Registry infrastructure and metadata framework  
- Knowledge governance stores + promotion pipeline  
- Runtime interface definitions (docs; code cutover Founder-gated)  
- Executive charters (Atlas, Sentinel, Founder) — Draft  
- Founder Workspace contracts  
- Operational validation scorecard  
- Governance state synchronization (MS-SYNC)  

## What Version 1.0 intentionally excludes

Per RES-001 out-of-scope and VAL-MVI interim acceptances:

- Full multi-department executive activation  
- Ask Atlas loader cutover to ATOS Canonical plane  
- Hub/Memory Keeper production code implementation  
- Complete ops SoT migration off legacy `atlas/` files  
- Large product UI redesign  
- MAN-004 / MAN-009 / MAN-012 (explicitly deferred; remain planned)  

## How to use

1. Start at [`ATOS.md`](../ATOS.md)  
2. Navigate via [`atos/NAVIGATION.md`](NAVIGATION.md)  
3. Obey Authoritative Specs/Standards  
4. Treat Manuals/Draft refs as operational guidance until promoted  
5. Run `npm run atos:check` before ATOS structural changes  

## Freeze

See [`GOV-FREEZE-1.0.0.md`](governance/GOV-FREEZE-1.0.0.md) (Review until Founder ratification).
