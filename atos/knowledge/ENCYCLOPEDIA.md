# ENCYCLOPEDIA — TalkForge Institutional Knowledge Index

| Field | Value |
|---|---|
| **Document ID** | ENCYCLOPEDIA |
| **Version** | 1.1.0 |
| **Status** | Authoritative navigation index |
| **Authority** | KA-001 v2.0 / RES-024 |
| **Steward** | AIF-KNOW |
| **Purpose** | One map of how major knowledge relates — encyclopedia, not a pile of files |
| **Success metric** | Easier to navigate, maintain, and reason over as it grows |

---

## How to use this index

1. Find the **plane** (Governance vs Research vs Product doctrine vs Operations).  
2. Open the **canonical home** for the concept (VOCAB-001).  
3. If writing something new, apply the **New Document Decision Rule** (below / KA-001 v2).  

---

## New Document Decision Rule (binding)

Before creating any new top-level document, ask:

1. Does this concept already exist?  
2. Should this be a **chapter** of an existing volume?  
3. Should this be an **appendix**?  
4. Should this simply be a **link** to existing knowledge?  

Create a new top-level document **only if none of the above fit** (genuinely new domain).

---

## Plane A — Governance (how the institution decides & learns)

| Home | Role | Links |
|---|---|---|
| ATOS Specs / Standards | Constitutional governance law | `atos/specifications/`, `atos/standards/` |
| Resolutions (RES-*) | Institutional seals | `atos/resolutions/` |
| **KA-001** | Where knowledge belongs + encyclopedia rules | [KA-001](../product/KA-001-unified-knowledge-architecture.md) |
| **TEA-001** | How domains communicate | [TEA-001](../product/TEA-001-enterprise-architecture.md) |
| DOC-OPT-001 / AIF-KNOW | Documentation quality & stewardship | [DOC-OPT](../product/DOC-OPT-001-documentation-optimization.md) · [AIF-KNOW](../executives/atlas-program/AIF-KNOW-STEWARDSHIP.md) |
| VOCAB-001 | One name per concept | [VOCAB-001](VOCAB-001-canonical-vocabulary.md) |
| REG-KNOW / LOAD-MANIFEST | Registry + agent load | [REG-KNOW](../registries/knowledge-registry.yaml) · [LOAD-MANIFEST](LOAD-MANIFEST.md) |
| Identity (interim) | Constitution, Brief, Laws, Philosophy | `atlas/` + [canonical/identity](canonical/identity/) |

---

## Plane B — Research (evidence & inquiry — not law)

| Volume / Home | Role |
|---|---|
| **[Connection Science volume](../product/research/connection-science/)** | RP-001 chapters: program · ledger · foundational Qs · templates · LP counsel · BP method |
| **[Benchmarks volume](../product/research/benchmarks/)** | “Who has already mastered this?” — BM-000 program · BM-001+ domain reports |
| Question Ledger | D-Q open questions | [questions.md](working/questions.md) |
| Evidence index | Packet hop | [evidence/index](evidence/index/README.md) |

Research may **inform** Product Canonical; it does **not** become Canonical without STD-002 promotion.

---

## Plane C — Product doctrine (Accepted / Working application)

| Home | Role |
|---|---|
| FLA-001 / PCM-001 | Product Canonical learning & growth |
| HBF-000…006 | Behavior models (Working) |
| AMD-001 / ELM-001 / PCI-001 | Dignity · Experience language · Craft |
| CE-001 / DIR-CE-001 | Communication Engine (execution) |
| Gates (MR, BR, PPS, RES) | What may run now |

Domain indexes: [canonical/](canonical/README.md)

---

## Plane D — Operations (live state — not Canonical law)

| Home | Role |
|---|---|
| ATLAS-HANDOFF-REGISTER | Live priorities |
| atlas/decisions.md | Decision log |
| projects / roadmap / metrics | Operational planning |
| DEPLOY-001 / LP-001 | Deploy & landing ops |

---

## Relationship diagram

```
Identity (stable)
    ↓
Governance (KA · TEA · Specs · RES · DOC-OPT)
    ↓
Research (Connection Science · Benchmarks · D-Q · D-EVID)  ← evidence in
    ↓
Product doctrine (FLA · PCM · HBF · AMD · ELM · PCI · CE)
    ↓
Operations (handoff · decisions · execution)
    ↓
Learning / evidence ──────────────────────────┘
```

---

## Quick “where does X live?”

| Concept | Canonical home |
|---|---|
| Knowledge homes / encyclopedia rules | KA-001 |
| Domain communication | TEA-001 |
| Connection science evidence | Connection Science ch.2 |
| Foundational science Qs | Connection Science ch.3 |
| Behavior models (needs/friction/…) | HBF-000 |
| Exemplar / best-practice method | Connection Science ch.6 (BP-001) |
| World benchmarks (“who mastered this?”) | Benchmarks volume (BM-000+) |
| Communication Science field map | BM-001 |
| Doc quality / anti-sprawl | DOC-OPT-001 + AIF-KNOW |
| Term definitions | VOCAB-001 |
| Live priorities | ATLAS-HANDOFF-REGISTER |

---

## Revision history

| Version | Date | Notes |
|---|---|---|
| 1.0.0 | 2026-07-26 | KA-001 v2.0 encyclopedia index (RES-024) |
| 1.1.0 | 2026-07-26 | Benchmarks volume + BM-001 Communication Science |
