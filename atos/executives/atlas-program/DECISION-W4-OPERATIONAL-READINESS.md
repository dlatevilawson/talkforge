# Founder Decision — W4 Operational Readiness (Pre-Visibility)

| Field | Value |
|---|---|
| **Document ID** | ATLAS-D-W4 |
| **Version** | 1.0.0 |
| **Status** | Authoritative |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Until superseded by Founder Decision |
| **Dependencies** | ATLAS-P3, RES-006, ATLAS-WAVES |
| **Related Documents** | `IMPLEMENTATION-WAVES.md`, `atlas/runtime/README.md` |
| **Approval History** | 2026-07-19 — Founder Decision for W4+ |
| **Change Log** | 2026-07-19 — Initial decision recorded |

---

## Decision

**Do not enable Founder-visible runtime yet.**

Before exposing Atlas (target plane) to the Founder, **W4** must prove that the runtime behaves correctly under real operational conditions.

### W4 objectives (mandatory before visibility)

1. **Production retention** — classify, retain, and (where applicable) enqueue promotion candidates without Canonicalization.  
2. **Exchange exposure** — prove Sentinel/domain/Founder exchange boundaries under dry-run / non-visible conditions.  
3. **Cutover readiness** — evidence against ATLAS-P3 Step 8 cutover gates before any flag lift.  

### Flag policy

| Flag | W4 stance |
|---|---|
| `ATLAS_RUNTIME_TARGET` | **Do not enable** for Founder exposure; separate Founder decision later |
| `ATLAS_RUNTIME_FOUNDER_VISIBLE` | **Do not enable**; separate Founder decision later |

Once W4 objectives are met and evidence supports them, the Founder may make a **separate** decision to enable those flags.

### Binding rules

1. W4 produces evidence — it does not grant Founder-visible target delivery.  
2. Loader freeze remains until an explicit later Founder cutover decision (W8).  
3. REG-PROMO-Q production Canonical publication remains STD-002 + Founder institutional approval.  
4. Engineering must not treat W4 completion as implicit permission to flip visibility flags.  

---

## Declaration

| Field | Value |
|---|---|
| **Approved By** | Founder |
| **Approval Date** | 2026-07-19 |
| **Status Upon Signature** | Authoritative |
