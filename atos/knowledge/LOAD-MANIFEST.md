# LOAD-MANIFEST — Agent Knowledge Inheritance (KA-001)

| Field | Value |
|---|---|
| **Document ID** | LOAD-MANIFEST |
| **Version** | 1.0.0 |
| **Status** | Authoritative (counsel load map) |
| **Authority** | KA-001 / RES-020 / KA-REORG-001 |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Dependencies** | KA-001, GOV-COMPAT, REG-KNOW |
| **Related Documents** | Ask Atlas loader (`atlas/engine/loader.ts`) — **frozen** until Founder Decision |
| **Approval History** | 2026-07-24 — Published with KA-REORG-001 |
| **Change Log** | 2026-07-24 — Initial domain-derived load sets |

> **GOV-COMPAT:** This manifest describes **counsel load sets** for Atlas and product agents. It does **not** change the Ask Atlas runtime loader freeze. Expanding or cutting over the Ask Atlas load set requires a separate Founder Decision.

---

## Stewardship reminder

No person, AI agent, or founder owns the truth. Load Canonical because it is currently the strongest evidence-supported, mission-aligned explanation — and remain ready to supersede it when better evidence arrives.

---

## Counsel load sets (by agent class)

### Atlas counsel (default)

| Order | Domain | Load |
|---|---|---|
| 1 | D-ID | `atos/knowledge/canonical/identity/` → live Identity sources |
| 2 | D-KG | SPEC-003, STD-002, REG-KNOW, KA-001 |
| 3 | D-LEARN / D-GROWTH | FLA-001, PCM-001 |
| 4 | D-DIGNITY / D-EXP / D-CRAFT | AMD-001, ELM-001, PCI-001 |
| 5 | D-ENGINE / D-GATES | CE-001, DIR-CE-001, active RES stack, BR-001, MR-001 |
| 6 | D-OPS | ATLAS-HANDOFF-REGISTER, `atlas/decisions.md` (recent) |
| 7 | D-Q / D-EVID | Open questions + relevant evidence packs |

**Must not invent:** New doctrine, Identity amendments, Spec amendments, Ask Atlas load expansion.

### Coaching agents

| Must load | Must not invent |
|---|---|
| FLA-001 · PCM-001 · AMD-001 · session config inheriting dignity | Identity diagnoses; parallel frameworks |

### Engineering agents

| Must load | Must not invent |
|---|---|
| TEP · CE-001 · DIR-CE-001 · active gates · relevant evidence | Spec/Identity amendments |

### Ask Atlas (legacy plane)

| Must load | Constraint |
|---|---|
| Frozen loader set in `atlas/engine/loader.ts` | No silent expansion; Founder Decision required for cutover |

---

## Domain index roots

| Domain | Index |
|---|---|
| D-ID | [canonical/identity/](canonical/identity/) |
| D-LEARN / D-GROWTH | [canonical/product/](canonical/product/) |
| D-EXP | [canonical/experience/](canonical/experience/) |
| D-DIGNITY | [canonical/dignity/](canonical/dignity/) |
| D-CRAFT | [canonical/craft/](canonical/craft/) |
| D-ENGINE | [canonical/engine/](canonical/engine/) |
| D-GATES | [canonical/gates/](canonical/gates/) |
| D-OPS | [canonical/ops/](canonical/ops/) |
| D-EVID | [evidence/](evidence/) |
| D-Q | [working/questions.md](working/questions.md) |

Master map: [canonical/README.md](canonical/README.md)
