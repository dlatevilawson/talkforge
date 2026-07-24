# LOAD-MANIFEST — Agent Knowledge Inheritance (KA-001 / TEA-001)

| Field | Value |
|---|---|
| **Document ID** | LOAD-MANIFEST |
| **Version** | 1.1.0 |
| **Status** | Authoritative (counsel load map + AI protocol) |
| **Authority** | KA-001 / TEA-001 / RES-020 / RES-021 |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Dependencies** | KA-001, TEA-001, GOV-COMPAT, REG-KNOW |
| **Related Documents** | Ask Atlas loader (`atlas/engine/loader.ts`) — **frozen** until Founder Decision |
| **Approval History** | 2026-07-24 — Published with KA-REORG-001; 2026-07-24 — TEA AI protocol |
| **Change Log** | 2026-07-24 — v1.1 AI communication protocol declarations |

> **GOV-COMPAT:** This manifest describes **counsel load sets** for Atlas and product agents. It does **not** change the Ask Atlas runtime loader freeze. Expanding or cutting over the Ask Atlas load set requires a separate Founder Decision.

---

## Stewardship reminder

No person, AI agent, or founder owns the truth. Load Canonical because it is currently the strongest evidence-supported, mission-aligned explanation — and remain ready to supersede it when better evidence arrives.

---

## AI communication protocol (TEA-001 §6)

Every AI agent shall declare:

| Class | May read | May modify | Requires evidence | Requires Atlas approval | Requires Founder approval |
|---|---|---|---|---|---|
| **Atlas counsel** | Identity · KA/TEA · Product Canonical · Dignity/ELM/PCI · CE/gates · Handoff · D-Q/D-EVID | Working counsel, evidence indexes, handoff ops (accurate reporting) | Claims affecting Canonical, gates, or Identity | Recommendations, promotion counsel, RES drafts | Identity amend, Spec amend, Institutional Approval, loader cutover, new enterprise domain |
| **Coaching agents** | FLA · PCM · AMD · session config | Session/working user state only | Coaching claims tied to user evidence | Escalations that change doctrine | Never redefine Identity / Specs |
| **Engineering agents** | TEP · CE · gates · relevant evidence | Application code under TEP | Production claims / milestone evidence | Architecture counsel affecting gates | Spec/Identity; deploy gates when Founder-gated |
| **Ask Atlas (legacy)** | Frozen loader set | None (read-grounded answers) | N/A beyond corpus | N/A | Loader expansion / cutover |

**Hard rule:** No AI agent may independently redefine institutional truth.

---

## Counsel load sets (by agent class)

### Atlas counsel (default)

| Order | TEA | KA | Load |
|---|---|---|---|
| 1 | E-ID | D-ID | `atos/knowledge/canonical/identity/` → live Identity sources |
| 2 | E-GOV | D-KG / D-GATES | SPEC-003, STD-002, REG-KNOW, KA-001, TEA-001, active RES |
| 3 | E-KNOW | D-LEARN / D-GROWTH | FLA-001, PCM-001 |
| 4 | E-KNOW / E-PROD | D-DIGNITY / D-EXP / D-CRAFT | AMD-001, ELM-001, PCI-001 |
| 5 | E-PROD / E-GOV | D-ENGINE / D-GATES | CE-001, DIR-CE-001, BR-001, MR-001 |
| 6 | E-OPS | D-OPS | ATLAS-HANDOFF-REGISTER, `atlas/decisions.md` (recent) |
| 7 | E-LEARN | D-Q / D-EVID | Open questions + relevant evidence packs |

**Must not invent:** New doctrine, Identity amendments, Spec amendments, Ask Atlas load expansion, frameworks outside TEA.

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

Enterprise architecture: [TEA-001](../product/TEA-001-enterprise-architecture.md). Master KA map: [canonical/README.md](canonical/README.md).
