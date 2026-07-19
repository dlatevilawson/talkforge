# Executive Organization — Communication Interfaces

| Field | Value |
|---|---|
| **Document ID** | EXEC-ORG-COMM |
| **Version** | 1.0.0-review |
| **Status** | Review |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Until Phase 4 ratification / on org change |
| **Dependencies** | ATLAS-P4, SPEC-006, EXEC-COLLAB, STD-003 |
| **Related Documents** | EXEC-ORG-DECISIONS, CHARTER-* |
| **Approval History** | 2026-07-19 — Phase 4 Step 3 |
| **Change Log** | 2026-07-19 — Governed executive communication catalog |

---

## Purpose

Define how executives communicate so material interaction is governed by **standard interfaces**, not informal conversation.

Supplements (does not silently replace) EXEC-COLLAB; on conflict with Phase 4, Phase 4 design prevails until Founder reconciles.

---

## Interface envelope (logical)

Every material interaction records:

| Field | Required |
|---|---|
| `from_office` | Yes |
| `to_office` | Yes |
| `interface_kind` | Yes |
| `subject` | Yes |
| `payload_ref` | Yes |
| `authority_labels_cited[]` | When knowledge cited |
| `binding` | Always `false` unless Founder Decision record |
| `created_at` | Yes |

---

## Interface kinds

| Kind | Use | Binding |
|---|---|---|
| Counsel | Ask for recommendation | Non-binding |
| Status | Domain report | Informational |
| Joint Option | Multi-exec alternatives | Non-binding until Founder/domain decision |
| Risk Notice | Must-not-drop finding | Informational; escalates if ignored per rules |
| Decision Request | Ask for decision | Pending |
| Decision Record | Founder or domain-autonomous decision logged | Binding within class |
| Delegation Notice | Founder temporary grant | Binding for scope/time |
| Escalation | Hard boundary | Non-binding counsel + mandatory Founder attention |
| Knowledge Candidate | STD-002 path | Never Canonical alone |

---

## Channel catalog

### Founder ↔ Atlas

| Kind | Typical content |
|---|---|
| Counsel / Decision Pack | Options, tradeoffs, confidence |
| Status | Organizational health synthesis |
| Escalation | Hard-boundary packages |
| Decision Record | Founder decisions Atlas must distribute |
| Delegation Notice | Temporary grants Atlas tracks |

### Atlas ↔ Sentinel

| Kind | Typical content |
|---|---|
| Counsel | Architecture/priority questions |
| Risk Notice | Integrity findings (**preserved verbatim**) |
| Joint Option | Schedule vs risk options |
| Escalation | Unresolved integrity vs delivery |

### Atlas ↔ Product / Engineering / Growth / Knowledge / Customer / Finance / Operations

| Kind | Typical content |
|---|---|
| Status | Domain metrics and blockers |
| Counsel | Priority and sequencing advice |
| Joint Option | Cross-domain packs |
| Risk Notice | Domain risks Atlas must surface to Founder when material |
| Knowledge Candidate | Only via Knowledge Executive process |

### Engineering ↔ Sentinel

| Kind | Rule |
|---|---|
| Status | Delivery plan and technical status |
| Risk Notice | Sentinel constraints Engineering must acknowledge |
| Joint Option | Mitigations; cannot erase Risk Notice |

### Engineering ↔ Knowledge

| Kind | Rule |
|---|---|
| Knowledge Candidate | Technical lessons → promotion process |
| Status | What is operational note vs institutional candidate |

### Growth ↔ Product

| Kind | Rule |
|---|---|
| Joint Option | Growth bets vs roadmap capacity |
| Status | Funnel truth vs product readiness |

### Customer ↔ Product

| Kind | Rule |
|---|---|
| Status / Risk Notice | Customer truth and severity |
| Joint Option | Roadmap response options |

### Finance ↔ Founder

| Kind | Rule |
|---|---|
| Status | Runway, burn, unit economics |
| Decision Request | Capital / irreversible spend |
| Risk Notice | Solvency / threshold breaches (auto-escalate class) |

### Finance ↔ Atlas

| Kind | Rule |
|---|---|
| Status | Constraints for priority synthesis |
| Counsel | Tradeoff framing — Finance owns economic truth |

### Knowledge ↔ Founder

| Kind | Rule |
|---|---|
| Knowledge Candidate / Decision Request | Canonical approval packages only via STD-002 |

### Operations ↔ Atlas

| Kind | Rule |
|---|---|
| Status | Cadence adherence, ops blockers |
| Counsel | Rhythm changes — Ops owns execution; Atlas owns intelligence packing |

---

## Anti-patterns (forbidden)

1. Material decision “agreed in chat” with no Decision Record.  
2. Dropping a Sentinel Risk Notice from Founder-facing packs.  
3. Atlas issuing domain Status as if Atlas owned the domain.  
4. Upgrading Draft/Legacy to Canonical in any interface payload.  
5. Side-channel override of Escalation or Delegation scope.  
