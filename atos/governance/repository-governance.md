# ATOS Repository Governance

| Field | Value |
|---|---|
| **Document ID** | GOV-REPO |
| **Version** | 1.0.0-m0 |
| **Status** | Draft |
| **Owner** | Founder |
| **AI Steward** | Atlas |
| **Human Approver** | Founder |
| **Review Cycle** | Each milestone |
| **Dependencies** | RES-001, ADR-0001 |
| **Related Documents** | `authority-model.md`, `metadata-framework.md`, `registry-framework.md`, `../NAVIGATION.md`, SPEC-001…SPEC-006 |
| **Approval History** | 2026-07-18 — M0 Draft |
| **Change Log** | 2026-07-18 — Initial repository governance for ATOS v1.0; 2026-07-18 — M1 cross-links to navigation and Specs |

---

## Purpose

Defines how ATOS artifacts are created, named, owned, indexed, and changed inside the TalkForge repository.

## Rules

1. **Hierarchy precedence:** Specifications > Standards > Manuals > References.
2. **No constitutional edits by AI executives.** Specs/Standards authority changes require Founder approval.
3. **One owner per artifact.** Owner is accountable; AI Steward maintains; Human Approver authorizes status transitions to `Authoritative`.
4. **Registry sync is mandatory.** Creating or modifying a governed document requires updating the relevant registry in the same change set.
5. **Metadata is mandatory** for governed documents (see Metadata Framework).
6. **Sparse creation.** Prefer registry entries with `state: planned` over empty content files.
7. **No dual authority.** A domain may have only one `Authoritative` canonical document at a time.
8. **Pre-ATOS separation.** `atlas/` is operational/legacy until promoted; it is not automatically ATOS-canonical.
9. **Milestone gates.** Per RES-001 and implementation directive, do not start the next milestone until Founder approval of the current milestone completion report.
10. **Traceability.** Significant layout or governance process changes require an ADR.

## Naming

| Artifact | ID pattern | Path pattern |
|---|---|---|
| Specification | `SPEC-00N` | `atos/specifications/SPEC-00N-*.md` |
| Standard | `STD-00N` | `atos/standards/STD-00N-*.md` |
| Manual | `MAN-00N` | `atos/manuals/MAN-00N-*.md` |
| Reference | `REF-Rnnn` | `atos/references/.../REF-Rnnn-*.md` |
| Resolution | `RES-00N` | `atos/resolutions/RES-00N-*.md` |
| ADR | `ADR-NNNN` | `atos/governance/ADR-NNNN-*.md` |

Filenames are lowercase kebab-case after the ID prefix.

## Change set expectations

Every ATOS change set should:

1. State the objective and governing documents.
2. Touch the minimum files required.
3. Update registries and change logs.
4. Leave validation notes in the milestone record when closing a milestone.
