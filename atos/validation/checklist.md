# Operational Validation Checklist

| Field | Value |
|---|---|
| **Document ID** | VAL-CHECK |
| **Version** | 1.0.0-m8 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Sentinel |
| **Human Approver** | Founder |
| **Review Cycle** | Each milestone close / M8 |
| **Dependencies** | VAL-ROOT, RES-001 |
| **Related Documents** | mvi-readiness.md, SCRIPT-ATOS-M8 |
| **Approval History** | 2026-07-18 — M8 Draft |
| **Change Log** | 2026-07-18 — Validation checklist dimensions |

---

## 1. Repository validation

- [x] `atos/` tree matches ADR-0001 sparse layout  
- [x] Entrypoint `ATOS.md` present  
- [x] Navigation links resolve (`atos/NAVIGATION.md`)  
- [x] REG-DOC paths resolve or are `null` (planned)  
- [x] Integrity scripts M0–M7 pass  

## 2. Governance validation

- [x] RES-001 Authoritative  
- [x] Specs SPEC-001…006 present  
- [x] Standards STD-001…006 present  
- [x] Authority state machine documented (GOV-AUTH)  
- [x] Milestone gates recorded M0–M7  
- [ ] Specs/Standards marked Authoritative (Founder ratification — **M9 gate**)  

## 3. Documentation validation

- [x] Required metadata on governed markdown  
- [x] YAML registry/schema headers complete  
- [x] Core manuals present (001–003, 013, 016, 017)  
- [x] Charters for Atlas/Sentinel/Founder  
- [x] Templates for metadata, promotion, briefs, reviews  

## 4. Knowledge validation

- [x] Promotion pipeline active (REG-KNOW / REG-PROMO-Q)  
- [x] Draft/Scaffold cannot auto-Canonicalize  
- [x] Legacy corpus classified (KNOW-CLASS-LEGACY)  
- [x] Canonical library empty (correct until approvals)  
- [x] Loader freeze intact  
- [ ] Single Identity Canonical source in ATOS plane (awaiting cutover/ratification)  

## 5. Runtime validation

- [x] Hub/Context/Memory/Sandbox interfaces defined  
- [x] Context authority tiers + Scaffold exclusion  
- [x] Memory classification classes defined  
- [x] STD-006 workflow documented  
- [x] R100x non-git storage rule  
- [x] MAN-013 present  
- [ ] Hub/Context Injector implemented in code (Founder-gated; not M8 required)  

## Enforcement

`npm run atos:check:m8` encodes automated portions of this checklist.
