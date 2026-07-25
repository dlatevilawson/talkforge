# ATOS Metadata Framework

| Field | Value |
|---|---|
| **Document ID** | GOV-META |
| **Version** | 1.0.0-m3 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each milestone |
| **Dependencies** | RES-001, GOV-AUTH |
| **Related Documents** | `metadata-application.md`, `atos/schemas/document-metadata.schema.yaml`, `atos/references/templates/REF-R1100-document-metadata-template.md` |
| **Approval History** | 2026-07-18 — M0 Draft |
| **Change Log** | 2026-07-18 — Initial metadata framework; 2026-07-18 — M3 application + template links |

---

## Purpose

Defines required metadata for every governed ATOS document so ownership, versioning, and approval are always recoverable.

## Required fields

| Field | Description |
|---|---|
| **Title** | Human-readable name (H1) |
| **Document ID** | Stable ID (`SPEC-001`, `STD-002`, …) |
| **Version** | Semver or `major.minor.patch[-milestone]` |
| **Status** | `Scaffold` \| `Draft` \| `Review` \| `Authoritative` \| `Superseded` \| `Archived` |
| **Owner** | Accountable human or executive role |
| **AI Steward** | AI executive responsible for maintenance |
| **Human Approver** | Approving authority (Founder for constitutional docs) |
| **Review Cycle** | Cadence or trigger for review |
| **Dependencies** | Parent/peer document IDs |
| **Related Documents** | Non-blocking references |
| **Approval History** | Dated approval events |
| **Change Log** | Dated material changes |

## Representation

For Version 1.0, metadata is represented as a markdown table immediately under the H1 title (see this document).

Machine schema: `atos/schemas/document-metadata.schema.yaml`.

## Application timeline

| Milestone | Expectation |
|---|---|
| M0 | Framework + schema exist; all M0 docs include metadata |
| M3 | Metadata applied/verified across all governed artifacts created to date — see **GOV-META-APP** |
| Ongoing | No new governed doc without metadata |

## See also

- [Metadata Application (GOV-META-APP)](metadata-application.md)
- [Metadata Template (REF-R1100)](../references/templates/REF-R1100-document-metadata-template.md)

## Template

```markdown
# <Title>

| Field | Value |
|---|---|
| **Document ID** | <ID> |
| **Version** | 1.0.0 |
| **Status** | Scaffold |
| **Owner** | <Owner> |
| **AI Steward** | <Steward> |
| **Human Approver** | Founder |
| **Review Cycle** | <cycle> |
| **Dependencies** | <ids> |
| **Related Documents** | <paths or ids> |
| **Approval History** | <events> |
| **Change Log** | <events> |
```
