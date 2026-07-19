# ATOS Repository Freeze — Version 1.0.0

| Field | Value |
|---|---|
| **Document ID** | GOV-FREEZE-1.0.0 |
| **Version** | 1.0.0 |
| **Status** | Authoritative |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Until next ATOS version |
| **Dependencies** | RES-001, RES-002, ATOS-RELEASE-1.0.0, GOV-AUTH, ADR-0001 |
| **Related Documents** | GOV-REPO, MS-M9, MS-SYNC |
| **Approval History** | 2026-07-19 — Authoritative upon Founder ratification of ATOS Version 1.0 (RES-002) |
| **Change Log** | 2026-07-19 — Freeze in effect; Version 1.0 ratified |

---

## Purpose

Defines what is frozen at ATOS Version 1.0.0 and how post-release changes must proceed.

**Effectiveness:** Authoritative as of Founder ratification under RES-002 (2026-07-19).

## Frozen (require Founder approval to change)

- SPEC-001…SPEC-006 (Authoritative text)  
- STD-001…STD-006 (Authoritative text)  
- RES-001, RES-002  
- Authority state machine principles (GOV-AUTH — Authoritative)  
- ADR-0001 storage-plane decisions (amend via new ADR + Founder)  

## Controlled (change via normal governance; no silent edits)

- Manuals, charters, registries, founder/runtime/knowledge ops docs  
- Validation scripts  
- Templates  

## Not frozen

- Product application code (`app/`, `lib/`, etc.) except when ATOS cutover is involved  
- Legacy `atlas/` corpus content (still GOV-COMPAT; cutover Founder-gated)  
- Empty Canonical library contents (grow via STD-002)  

## Post-1.0.0 process

1. Propose change with evidence.  
2. Follow applicable Spec/Standard change management.  
3. Update registries + change logs in the same change set.  
4. Pass `npm run atos:check`.  
5. Founder approval for constitutional layers.  

ATOS is not rewritten outside this process. Future development occurs within ATOS.
