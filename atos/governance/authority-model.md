# ATOS Authority Model

| Field | Value |
|---|---|
| **Document ID** | GOV-AUTH |
| **Version** | 1.0.0-m0 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | On constitutional change |
| **Dependencies** | RES-001, Spec 002/003 (when present) |
| **Related Documents** | `metadata-framework.md`, `compatibility-atlas-pre-atos.md` |
| **Approval History** | 2026-07-18 — M0 Draft |
| **Change Log** | 2026-07-18 — Initial authority state machine |

---

## Founder Authority (exclusive)

Per RES-001, only the Founder may:

- Approve constitutional amendments
- Approve Specifications and Standards (Authoritative status)
- Restructure the organization
- Appoint executives
- Approve major architectural changes
- Release ATOS versions

## Delegated Authority

| Executive | May | May not |
|---|---|---|
| **Atlas** | Coordinate implementation, recommend priorities, organize work, monitor progress, produce reports | Alter constitutional governance |
| **Sentinel** | Review engineering, protect architecture, validate implementations, investigate technical issues | Alter constitutional governance |
| **CIO (implementation agent)** | Execute approved milestones, create Draft/Scaffold artifacts, maintain registries, validate | Approve Specs/Standards; change Identity; bypass milestone gates |

## Authority State Machine

```
Scaffold → Draft → Review → Authoritative
                              ↓
                         Superseded → Archived
```

### Transition rules

| From | To | Approver |
|---|---|---|
| (new) | Scaffold | AI Steward or Owner |
| Scaffold | Draft | Owner |
| Draft | Review | Owner |
| Review | Authoritative | **Founder** |
| Authoritative | Superseded | Founder (via replacement approval) |
| any | Archived | Founder or delegated archive process |

## Anti-Hollow Rule

1. `Scaffold` documents contain structure/navigation only — not normative policy.
2. Runtime Context Injectors and Ask Atlas must exclude `Scaffold` from institutional context.
3. `Draft` Specs/Standards are not organizational law until `Authoritative`.
4. Registries may list `planned` artifacts that have no file yet.

## Knowledge authority (preview for M4)

Until M4 completes:

- Pre-ATOS `atlas/*.md` remains the **live Ask Atlas corpus** (legacy plane).
- ATOS documents are the **target governance plane**.
- Neither plane may silently overwrite the other.
