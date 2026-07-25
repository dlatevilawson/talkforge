# Document Metadata Template

| Field | Value |
|---|---|
| **Document ID** | REF-R1100 |
| **Version** | 1.0.0-m3 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | When Metadata Framework changes |
| **Dependencies** | GOV-META, SCH-META-001 |
| **Related Documents** | GOV-META-APP, STD-001 |
| **Approval History** | 2026-07-18 — M3 template published |
| **Change Log** | 2026-07-18 — Initial metadata template (Level 4 template precursor to R1101+) |

---

## Purpose

Copy the table below into every new governed ATOS markdown document. Fill every cell. Empty values are invalid.

## Required metadata table

```markdown
# <Title>

| Field | Value |
|---|---|
| **Document ID** | <STABLE-ID> |
| **Version** | <major.minor.patch[-milestone]> |
| **Status** | Scaffold \| Draft \| Review \| Authoritative \| Superseded \| Archived |
| **Owner** | <role or person> |
| **AI Steward** | <executive role> |
| **Human Approver** | Founder |
| **Review Cycle** | <cadence or trigger> |
| **Dependencies** | <parent document IDs> |
| **Related Documents** | <paths or IDs> |
| **Approval History** | <dated events> |
| **Change Log** | <dated material changes> |
```

## Field rules (M3)

| Field | Rule |
|---|---|
| Document ID | Stable; never reuse for a different artifact |
| Version | Bump minor for material edits; patch for typo/metadata-only |
| Status | Follow GOV-AUTH state machine |
| Owner | Accountable human or executive role (never blank) |
| AI Steward | Maintaining AI executive (Atlas/Sentinel/…) |
| Human Approver | Founder for constitutional docs; otherwise named approver |
| Review Cycle | Explicit trigger (e.g., “Each milestone”, “On amendment”) |
| Dependencies | Parent authority documents |
| Related Documents | Non-blocking links |
| Approval History | Append-only dated events |
| Change Log | Append-only dated material changes |
