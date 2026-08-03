# HARDEN-002 — Identity Integrity

| Field | Value |
|---|---|
| **Document ID** | HARDEN-002 |
| **Version** | 0.1.0 |
| **Date** | 2026-08-03 |
| **Status** | **Milestone 4.1 complete — Founder approval gate** |
| **Scope** | Phase 4 identity integrity only |
| **Governing certification** | [EXEC-VERIFY-001](EXEC-VERIFY-001-final-architecture-certification.md) |
| **Prior certification** | [HARDEN-001](HARDEN-001-final-architecture-hardening.md) — Frozen Historical |

---

## Mission

Make Living Profile identity ownership enforceable in runtime and persistence.
This checkpoint does not reopen HARDEN-001 and does not authorize feature
development.

---

## Milestone 4.1 — Write Authority Enforcement

# **COMPLETED**

### Objective

Close the gap between the declared write-authority contract and shipping write
paths:

- member identity mutations must invoke the canonical write guard;
- session experiences may append pending evidence only;
- session persistence must not create or rewrite Living Profile identity.

### Implementation

1. Member-declared provenance is checked with
   `canWriteLivingProfileField("member", ...)` before a member update can
   complete.
2. Session proposals are converted only into unconfirmed provenance. Any
   proposal already authorized to write identity is rejected from the
   experience path.
3. Session completion now persists only `provenance` and `updated_at`.
4. The prior whole-profile upsert was removed from the session path. A session
   cannot create a missing Living Profile or copy stale identity fields over a
   member edit.

### Acceptance criteria

| Criterion | Result |
|---|---|
| Member-declared identity remains writable | **Pass** |
| Canonical guard is invoked by member identity updates | **Pass** |
| Pending session evidence remains `memberConfirmed: false` | **Pass** |
| Pending session evidence cannot authorize identity writes | **Pass** |
| Session persistence sends no identity columns | **Pass** |
| Session persistence cannot upsert/create Living Profile | **Pass** |
| Existing identity fields remain unchanged when evidence is attached | **Pass** |

### Evidence

| Check | Result |
|---|---|
| Priority revalidation | **Pass** — Founder authorized HARDEN-002; no newer direction supersedes it |
| Authority model exercise | **Pass** — member identity allowed; pending session evidence denied identity authority |
| Identity preservation exercise | **Pass** — attaching evidence preserves declared identity fields |
| Persistence invariant | **Pass** — provenance-only `update`; no identity payload or `upsert` |
| `npm run typecheck` | **Pass** |
| `npm run lint` | **Pass with one pre-existing unused-variable warning** |
| `npm run build` | **Pass** — 54 routes |
| `git diff --check` | **Pass** |

### Residual risks

- Provenance updates remain last-write-wins until Milestone 4.2 adds optimistic
  concurrency.
- GET-triggered legacy backfill remains until Milestone 4.3.
- CoachMemory identity fallback remains until Milestone 4.4.
- Authenticated persistence was not exercised in this environment because no
  Supabase test configuration or authorized test-member credentials are
  available.

### Rollback

Restore the former `saveLivingProfile` whole-row upsert and its session call,
then remove the member/proposal guard checks. No schema or data rollback is
required. This rollback would reopen certified INT-05 and is not recommended
except to restore service during an incident.

---

## Milestones Not Started

- Milestone 4.2 — optimistic concurrency and conflict handling
- Milestone 4.3 — explicit provenance-safe legacy migration
- Milestone 4.4 — CoachMemory identity cutover

---

## Gate

# **NO-GO**

Milestone 4.1 stops at the Founder checkpoint. Do not begin Milestone 4.2
without explicit Founder approval. Feature development and held identity merges
remain blocked under EXEC-VERIFY-001 and FREEZE-001.
