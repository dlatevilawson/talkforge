# DEC-LEDGER-001 — Decision Ledger

| Field | Value |
|---|---|
| **Document ID** | DEC-LEDGER-001 |
| **Version** | 1.1.0 |
| **Status** | **Active — EXEC-001 Step 3 Complete** |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Updated** | 2026-08-04 |
| **Live ledger** | [`atlas/decisions.md`](../../atlas/decisions.md) |
| **Authority** | EXEC-001 Step 3 · CONST-001 · Constitutional Law #001 |
| **Plane** | Operational Canonical record (decisions) — not Idea Vault |

---

## Purpose

Record every important company decision so reasoning is never lost and future work stays aligned with Founder intent.

---

## Required fields (every major decision)

| Field | Required |
|---|---|
| **Decision** (Title) | Yes |
| **Why** (Reason) | Yes |
| **Alternatives Considered** | Yes (or explicit “None recorded”) |
| **Blind Spots** | Yes (link Blind Spot Register IDs when available) |
| **Risks** | Yes |
| **Final Decision** / Status | Yes |
| **Future Review Date** | Yes (or “None — stable”) |
| **Related volumes** | Recommended |

---

## Entry template

```markdown
# Decision NNN

Title:
{short title}

Reason:
{why}

Alternatives Considered:
{list or None recorded}

Blind Spots:
{list or BS-* IDs}

Risks:
{list}

Final Decision:
{what was decided}

Future Review Date:
{YYYY-MM-DD or None — stable}

Volumes:
{paths}

Status:
Authoritative — {state}
```

---

## Operating rules

1. Every major decision is recorded in `atlas/decisions.md` using the template above.
2. Constitutional **admission** (Law #001) must appear as a Decision entry.
3. Decisions do not silently rewrite the Constitution — they may *admit* amendments.
4. Atlas may draft Decision entries; Founder approval makes them Authoritative.
5. Idea Vault captures ideas; the Decision Ledger records **choices**.

---

## Index of recent EXEC / doctrine decisions

| ID | Title | Status |
|---|---|---|
| 043 | Forge Laws #012–#013; Phase 1.5 | Adopted |
| 048 | EXEC-001 + Idea Vault Step 1 | Step 1 Frozen |
| 049 | Constitution Step 2 | Step 2 Frozen (+ Law #001 / Admission Rule) |
| 050 | Authorize Steps 3–18 continuum | See Decision 050 |
| 052 | Admit Craft Law #001 + Design Principle #001 | Canonical |
| 058 / CXA-001 | Admit Chief Experience Architect Charter | Canonical |

Full history: `atlas/decisions.md`.

---

## Step 3 deliverable checklist

- [x] Ledger purpose and rules published
- [x] Required fields defined (Decision, Why, Alternatives, Blind Spots, Risks, Final, Review Date)
- [x] Template published
- [x] Live home confirmed (`atlas/decisions.md`)
- [x] Linked from EXEC-001

---

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-08-02 | EXEC-001 Step 3 — Decision Ledger formalized |
| 1.1.0 | 2026-08-04 | Indexed Decision 058 / CXA-001 constitutional admission |
