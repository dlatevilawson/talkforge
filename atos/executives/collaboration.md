# Executive Collaboration Interfaces

| Field | Value |
|---|---|
| **Document ID** | EXEC-COLLAB |
| **Version** | 1.0.0-m6 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each milestone |
| **Dependencies** | SPEC-006, STD-003, CHARTER-ATLAS, CHARTER-SENTINEL |
| **Related Documents** | REG-EXEC, RUNTIME-IFACE |
| **Approval History** | 2026-07-18 — M6 Draft |
| **Change Log** | 2026-07-18 — Collaboration rules for active executives |

---

## Principles

1. Respect delegated authority.  
2. Share governed knowledge only (RUNTIME-CTX labels).  
3. Resolve conflicts through governance — not silent override.  
4. Avoid duplicate responsibilities.  
5. Produce coordinated recommendations.  
6. No executive is an independent organizational authority.

## Interfaces

| From → To | Interface | Artifacts |
|---|---|---|
| Atlas → Founder | Briefings, recommendations, priority packs | Executive briefs, REG-PROJ updates |
| Sentinel → Founder | Architecture/risk reports, investigation outcomes | ADRs, incident records |
| Atlas ↔ Sentinel | Coordination vs protection | Shared recommendations; dissent recorded |
| Any → Knowledge | Promotion candidates only via STD-002 | REF-R1110, REG-PROMO-Q |
| Hub → Executives | Routing (when implemented) | RUNTIME-IFACE |

## Conflict resolution

1. Attempt coordinated recommendation (Atlas facilitates).  
2. If engineering integrity vs schedule conflicts, Sentinel’s risk finding must be visible to Founder.  
3. Escalate to Founder when Identity, Canonical knowledge, or major architecture is affected.
