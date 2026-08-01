# Idea Vault — TalkForge Living Repository

| Field | Value |
|---|---|
| **Document ID** | IV-ROOT |
| **Version** | 1.0.0 |
| **Status** | **Working — Awaiting Founder review (EXEC-001 Step 1)** |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Created** | 2026-08-01 |
| **Authority** | [EXEC-001](../../../product/EXEC-001-talkforge-execution-plan.md) · KA-001 (Working knowledge) |
| **Plane** | Working — **not** Canonical · **not** loadable as institutional truth until promoted |

---

## Purpose

Capture every idea so nothing is forgotten.

This is the permanent repository for every philosophy, law, feature, UX concept, research finding, product idea, and future vision discussed during TalkForge’s development. Once an idea is here, later steps (Constitution, Decision Ledger, Research Library, Blind Spot Register, Roadmap) can reference it by ID.

---

## Categories

| Folder | Category | Use for |
|---|---|---|
| [`philosophy/`](philosophy/) | Philosophy | Beliefs about people, practice, coaching, identity |
| [`laws/`](laws/) | Laws | Immutable operating constraints |
| [`product-ideas/`](product-ideas/) | Product Ideas | Systems, architectures, product shapes |
| [`features/`](features/) | Features | Concrete capabilities to build |
| [`ux-ideas/`](ux-ideas/) | UX Ideas | Experience, surface, interaction concepts |
| [`ai-ideas/`](ai-ideas/) | AI Ideas | Model behavior, judgment, pedagogy patterns |
| [`research-ideas/`](research-ideas/) | Research Ideas | Claims / questions needing evidence |
| [`future-ideas/`](future-ideas/) | Future Ideas | Valuable but intentionally postponed |
| [`rejected-ideas/`](rejected-ideas/) | Rejected Ideas | Explicitly declined — with why |

Master index: [`INDEX.md`](INDEX.md)  
Entry template: [`TEMPLATE.md`](TEMPLATE.md)

---

## How to add an idea

1. Copy [`TEMPLATE.md`](TEMPLATE.md).
2. Assign the next free ID in that category (`IV-{CAT}-{NNN}`).
3. Place the file in the matching folder.
4. Add a row to [`INDEX.md`](INDEX.md).
5. Do **not** delete rejected ideas — move them to `rejected-ideas/` with reason.

---

## Status values (per entry)

| Status | Meaning |
|---|---|
| `Captured` | Logged; not yet strategy-processed |
| `Active` | In use / binding in current doctrine |
| `Parking` | Valuable; postponed (also mirrors Future Parking Lot later) |
| `Rejected` | Explicitly declined |
| `Superseded` | Replaced by another idea ID |

---

## Fact-check marks (preview — formalized in Step 9)

| Mark | Meaning |
|---|---|
| `Verified` | Evidence-backed |
| `Partially Verified` | Some support |
| `Hypothesis` | Testable claim |
| `Opinion` | Founder / team judgment |
| `Needs Research` | Must not guide product yet |

Step 1 only requires **capture**. Full fact-check is Step 9.

---

## Relationship to existing ATOS assets

| Existing | Relationship |
|---|---|
| `atlas/constitution.md` | Constitution (Step 2 will formalize / expand) |
| `atlas/forge-laws.md` | Laws — vault entries **point to** laws; laws remain authoritative |
| `atlas/decisions.md` | Decision Ledger (Step 3) |
| `atos/product/research/`, HBF | Research seeds (Step 4 library) |
| SYS1 / SYS2 / POM (doctrine branch / PR) | Seeded here as Product Ideas; doctrine docs remain authority when merged |

**Anti-hollow rule:** Vault entries are Working captures. They do not override Frozen doctrine or Canonical publications.

---

## Founder review checklist (Step 1)

- [ ] Categories match how we think about TalkForge
- [ ] ID scheme and template are usable
- [ ] Seed set covers the important ideas we have already discussed
- [ ] Nothing critical is missing that should be captured before Step 2
- [ ] Approve Step 1 so Constitution work (Step 2) may begin

---

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-08-01 | Initial Idea Vault + seed corpus for EXEC-001 Step 1 |
