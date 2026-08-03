# HARDEN-002 — Identity Integrity

| Field | Value |
|---|---|
| **Document ID** | HARDEN-002 |
| **Version** | 0.4.0 |
| **Date** | 2026-08-03 |
| **Status** | **Milestone 4.4 complete — Founder approval gate** |
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

## Milestone 4.2 — Optimistic Concurrency and Conflict Handling

# **COMPLETED**

### Objective

Prevent member edits and session provenance from silently overwriting one
another when they begin from different Living Profile revisions.

### Implementation

1. Living Profile rows now carry a positive, monotonic `version`.
2. Member clients submit the version they loaded. Missing versions receive
   `428`; stale versions receive `409` and never write.
3. Successful member updates compare the expected version and increment it
   exactly once. New rows begin at version `1`.
4. Session provenance updates use the same compare-and-swap boundary and never
   update identity columns.
5. A session conflict reloads the current profile, merges stable proposal IDs,
   and retries once. A second conflict fails closed instead of losing data.

### Acceptance criteria

| Criterion | Result |
|---|---|
| Persisted profiles have a non-null positive version | **Pass** |
| New profile rows start at version `1` | **Pass** |
| Successful writes increment exactly once | **Pass** |
| Missing client version is rejected | **Pass** |
| Stale member version returns `409` without writing | **Pass** |
| Stale session evidence reloads, deduplicates, and retries once | **Pass** |
| A repeated conflict fails closed | **Pass** |
| Existing identity fields remain outside session update payloads | **Pass** |

### Evidence

| Check | Result |
|---|---|
| Priority revalidation | **Pass** — Founder certified 4.1 and authorized 4.2; no newer direction supersedes it |
| Migration artifact | **Pass** — idempotent non-null `bigint` with positive constraint |
| Production impact | **Pass** — zero Living Profile rows before migration |
| Transactional preflight | **Pass** — migration executed and rolled back |
| Production application | **Pass** — version migration applied through authorized Management API |
| Idempotency rerun | **Pass** |
| Production schema | **Pass** — default `1`, non-null, positive constraint present |
| Production CAS transaction | **Pass** — current version accepted; stale version rejected |
| Test cleanup | **Pass** — CAS transaction rolled back; zero Living Profile rows remain |
| Version/evidence model exercise | **Pass** — token preserved through merge; duplicate proposal is a no-op |
| `npm run typecheck` | **Pass** |
| `npm run lint` | **Pass with one pre-existing unused-variable warning** |
| `npm run build` | **Pass** — 54 routes |
| `git diff --check` | **Pass** |

### Residual risks

- Authenticated HTTP `428`/`409` responses were not browser-tested because this
  environment has no authorized test-member credentials.
- GET-triggered legacy backfill remains until Milestone 4.3.
- CoachMemory identity fallback remains until Milestone 4.4.

### Recovery and rollback

The migration is additive and forward recovery is preferred. If application
conflict handling fails, deploy the certified 4.1 revision first; the unused
`version` column can safely remain. Drop the constraint and column only after
all version-aware application code is removed. No identity payload was changed
by the migration itself.

---

## Milestone 4.3 — Explicit Provenance-Safe Legacy Migration

# **COMPLETED**

### Objective

Remove mutation from Living Profile reads and ensure every legacy CoachMemory
import is explicit, idempotent, traceable, and unconfirmed.

### Implementation

1. `GET /api/living-profile` is now strictly read-only.
2. Legacy migration requires an authenticated `POST /api/living-profile`.
3. Legacy nickname, goals, challenges, and coaching style become stable
   `sourceKind: "imported"` provenance records with low confidence and
   `memberConfirmed: false`.
4. Explicit migration updates provenance only for existing profiles; it never
   overwrites identity fields.
5. Import-only rows produced by the former migration are repaired forward:
   their values move to pending evidence, identity fields clear, and confirmed
   import markers are demoted.

### Acceptance criteria

| Criterion | Result |
|---|---|
| Living Profile GET performs no write or CoachMemory query | **Pass** |
| Migration requires an explicit authenticated POST | **Pass** |
| Legacy values do not overwrite identity fields | **Pass** |
| Imported provenance is low-confidence and unconfirmed | **Pass** |
| Imported provenance cannot authorize identity writes | **Pass** |
| Stable evidence IDs make repeated migration a no-op | **Pass** |
| Prior import-only identity is converted to pending evidence | **Pass** |
| Corrective migration is idempotent | **Pass** |

### Evidence

| Check | Result |
|---|---|
| Priority revalidation | **Pass** — Founder certified 4.2 and authorized 4.3; no newer direction supersedes it |
| Read-only route invariant | **Pass** — GET contains no CoachMemory query or persistence operation |
| Migration model exercise | **Pass** — identity preserved; four legacy classes imported unconfirmed; rerun adds zero |
| Corrective migration preflight | **Pass** — legacy fixture repaired and transaction rolled back |
| Corrective migration idempotency | **Pass** — fixture version unchanged on rerun |
| Production application | **Pass** — corrective migration applied through authorized Management API |
| Production idempotency rerun | **Pass** |
| Production state | **Pass** — zero Living Profile rows, CoachMemory absent, zero confirmed imports |
| `npm run typecheck` | **Pass** |
| `npm run lint` | **Pass with one pre-existing unused-variable warning** |
| `npm run build` | **Pass** — 54 routes |
| `git diff --check` | **Pass** |

### Residual risks

- Authenticated POST migration was not browser-tested because this environment
  has no authorized test-member credentials.
- CoachMemory identity fallback in coach prompt construction remains until
  Milestone 4.4.

### Recovery and rollback

Application rollback may deploy the certified 4.2 revision. The corrective
data migration is forward-only: do not automatically re-promote imported values
to confirmed identity. Imported claims remain preserved as pending provenance,
so members can confirm or dismiss them without data loss.

---

## Milestone 4.4 — CoachMemory Identity Cutover

# **COMPLETED**

### Objective

Remove the final shadow-identity read path so coaching consumes identity only
from Living Profile while preserving allowed last-session continuity.

### Implementation

1. Coach name, nickname, purpose, principles, seasons, coaching style, and
   confirmed strengths now come exclusively from Living Profile.
2. CoachMemory goals, challenges, preferences, fears, triggers, learning style,
   wins, focus fields, and identity labels no longer enter coach context.
3. Missing Living Profile identity produces neutral defaults rather than
   falling back to legacy identity.
4. CoachMemory retains only allowed continuity reads: session count, last
   scenario, last summary, and last-session time.
5. The server query now selects only continuity columns from `coach_memory`.

### Acceptance criteria

| Criterion | Result |
|---|---|
| Living Profile is the sole coach identity source | **Pass** |
| Poisoned CoachMemory identity cannot enter coach context or prompt text | **Pass** |
| Missing Living Profile does not revive legacy identity | **Pass** |
| Unconfirmed imported provenance is not promoted as identity | **Pass** |
| Confirmed Living Profile strength remains available | **Pass** |
| Session count and last-session continuity remain available | **Pass** |
| Server CoachMemory query contains continuity columns only | **Pass** |

### Evidence

| Check | Result |
|---|---|
| Priority revalidation | **Pass** — Founder certified 4.3 and authorized 4.4; no newer direction supersedes it |
| Shadow identity injection | **Pass** — poisoned legacy values absent from context and formatted prompt |
| Living Profile identity | **Pass** — declared name, purpose, principle, season, style, and confirmed strength present |
| Null Living Profile | **Pass** — neutral identity defaults; continuity preserved |
| Imported evidence boundary | **Pass** — unconfirmed legacy strength excluded |
| Data-access boundary | **Pass** — CoachMemory query selects continuity fields only |
| `npm run typecheck` | **Pass** |
| `npm run lint` | **Pass with one pre-existing unused-variable warning** |
| `npm run build` | **Pass** — 54 routes |
| `git diff --check` | **Pass** |

### Residual risks

- Authenticated realtime and text coach endpoints were not exercised because
  this environment has no authorized test-member credentials.
- Members with no Living Profile identity receive intentionally neutral coach
  context until they declare or confirm identity.

### Rollback

Deploy the certified 4.3 revision. No schema or data rollback is required.
Rollback would reopen the CoachMemory shadow-identity path identified as
DATA-03 and should be used only for emergency service recovery.

---

## Phase 4 Implementation Status

All HARDEN-002 implementation milestones are complete. This checkpoint remains
open pending Founder certification and must not be frozen or extended into
Phase 5 without an explicit Founder decision.

---

## Gate

# **NO-GO**

Milestone 4.4 stops at the Founder checkpoint. Do not begin Phase 5 without
explicit Founder approval and a separate checkpoint document. Feature
development and held identity merges remain blocked under EXEC-VERIFY-001 and
FREEZE-001.
