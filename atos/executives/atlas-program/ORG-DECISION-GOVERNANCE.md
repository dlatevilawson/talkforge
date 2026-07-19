# Executive Organization — Decision Governance

| Field | Value |
|---|---|
| **Document ID** | EXEC-ORG-DECISIONS |
| **Version** | 1.0.0 |
| **Status** | Authoritative |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Until Founder-amended |
| **Dependencies** | ATLAS-P4, SPEC-006, STD-003, STD-001, STD-002, GOV-AUTH |
| **Related Documents** | EXEC-ORG-COMM, CHARTER-* |
| **Approval History** | 2026-07-19 — Phase 4 Step 4 ; 2026-07-19 — RES-007 Authoritative|
| **Change Log** | 2026-07-19 — Organizational decision system |

---

## Purpose

Design the organizational decision system: who decides, when to escalate, evidence required, how disagreement is preserved, how deadlocks resolve.

---

## Decision classes

### C0 — Constitutional (Founder only)

- Spec/Standard ratification and Identity amendments  
- Executive appointment/removal  
- ATOS version releases  
- Institutional approval for Canonical knowledge  
- Organizational restructuring of permanent offices  

### C1 — Founder-binding (requires Founder approval)

- Major architecture changes (STD-001 path)  
- Material capital deployment / irreversible spend above Finance threshold (threshold set by Founder)  
- Unresolved C3 multi-executive conflicts  
- Priority resets that reorder company mission tradeoffs  
- Enabling Founder-visible Atlas runtime / loader freeze lift (Atlas Program gates)  

### C2 — Domain-autonomous

Domain executive may decide when **all** hold:

1. Within charter scope  
2. Reversible or low-irreversibility  
3. No constitutional side effects  
4. No Sentinel Risk Notice in conflict (if engineering integrity affected → C4)  
5. Recorded as Decision Record (domain)  

Examples: Product iteration scope within approved roadmap theme; Growth experiment within approved budget envelope; Ops checklist changes.

### C3 — Multi-executive

Required when decision materially affects two or more domains.

Process:

1. Initiating executive opens Joint Option via Atlas.  
2. Affected executives attach position + evidence.  
3. Atlas publishes coordinated pack (alternatives, tradeoffs) — **not forced consensus**.  
4. If agreement → domain Decision Records + Atlas distribution.  
5. If disagreement persists → C1 Decision Request to Founder with dissent preserved.

### C4 — Auto-escalate (immediate Founder attention)

| Trigger | Source |
|---|---|
| Engineering integrity vs ship pressure unresolved | Sentinel Risk Notice |
| Identity / Canonical risk | Knowledge / any |
| Runway / solvency / capital threshold breach | Finance |
| Security / incident severity per investigation standard | Sentinel |
| Charter breach / authority laundering attempt | Atlas or any |
| Customer harm severity threshold | Customer |

---

## Evidence thresholds

| Decision type | Minimum evidence |
|---|---|
| Material recommendation | STD-003 complete fields |
| Significant architecture | STD-001 |
| Canonical promotion | STD-002 full stage path |
| Incident-related | STD-005 / governing investigation standard |
| Insufficient evidence | Insufficient-Knowledge Notice or escalate — **never invent** |

Confidence ≠ authority. High confidence does not grant C0/C1 rights.

---

## Which decisions require Founder approval?

All **C0** and **C1**, plus any **C4** package (Founder may defer or decide).

## Which can executives make independently?

**C2** only, within charter, recorded.

## Which require multiple executives?

**C3** cross-domain impacts.

## Which automatically escalate?

**C4** triggers above.

## Disagreement preservation

- Dissent must name office, claim, evidence, and requested outcome.  
- Atlas must not collapse dissent into false unanimity.  
- Sentinel findings appear unedited in Founder packs when material.

## Deadlock resolution

1. Time-box facilitation (Atlas).  
2. Publish options with explicit unresolved delta.  
3. Founder Decision Request (C1).  
4. Founder Decision Record binds; Atlas distributes; domains execute within scope.

---

## Atlas role in decisions

| May | Must not |
|---|---|
| Facilitate, package, recommend, track | Cast the Founder decision |
| Surface missing evidence | Invent evidence |
| Preserve dissent | Erase Sentinel/Finance/Customer risk truths |
