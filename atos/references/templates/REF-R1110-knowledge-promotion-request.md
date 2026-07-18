# Knowledge Promotion Request Template

| Field | Value |
|---|---|
| **Document ID** | REF-R1110 |
| **Version** | 1.0.0-m4 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | When STD-002 changes |
| **Dependencies** | STD-002, GOV-KNOW |
| **Related Documents** | REG-PROMO-Q, KNOW-EVIDENCE |
| **Approval History** | 2026-07-18 — M4 template |
| **Change Log** | 2026-07-18 — Initial KPS promotion request template |

---

Copy into `atos/knowledge/promotion/requests/` (create when first used) or attach evidence under `atos/knowledge/evidence/`.

## Request form

```markdown
# Promotion Request — <short title>

| Field | Value |
|---|---|
| **Request ID** | PROMO-NNN |
| **Date** | YYYY-MM-DD |
| **Requester** | <name/role> |
| **AI Steward** | <executive> |
| **Current Stage** | Observation \| Investigation \| … |
| **Target Confidence** | Verified \| Canonical | …
| **Knowledge Type** | Identity \| Institutional \| Operational \| Working \| Observation \| Historical |
| **Source Path(s)** | <paths> |
| **Evidence Path(s)** | <paths> |
| **Proposed Canonical Path** | atos/knowledge/canonical/<file> |
| **Domain** | <one domain; one canonical source rule> |
| **Reviewer** | <role> |
| **Institutional Approver** | Founder |

## Summary
<what should become institutional knowledge>

## Evidence
<source, evidence, confidence, date, version>

## Alternatives / dissent
<if any>

## Risks if promoted incorrectly
<dual authority, identity conflict, etc.>

## Stage history
| Stage | Date | Actor | Outcome |
|---|---|---|---|
| Observation | | | |
```

## Queue sync

When opening a request, add an item to `atos/knowledge/promotion/queue.yaml` in the same change set.
