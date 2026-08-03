# HARDEN-001 — Final Architecture Hardening

| Field | Value |
|---|---|
| **Document ID** | HARDEN-001 |
| **Version** | 1.5.0 |
| **Date** | 2026-08-03 |
| **Status** | **Frozen Historical — Phase 3 certified with documented verification dependency** |
| **Governing certification** | [EXEC-VERIFY-001](EXEC-VERIFY-001-final-architecture-certification.md) |
| **Frozen by** | Founder approval — 2026-08-03 |
| **Successor rule** | Phase 4 and later work require separate checkpoint documents |

---

## Mission

Eliminate certified blockers in strict order. This is a hardening record, not a feature plan.

This document is now an immutable historical certification record. Do not append
Phase 4 or later implementation evidence. Corrections require an explicit
Founder-authorized erratum or a separate re-certification document.

---

## Phase 1 — Secure Atlas

### Completed

`POST /api/atlas` now performs all checks before parsing the request or calling an AI workload:

1. `requireApiUser()` requires an authenticated Supabase claim.
2. `readSession()` plus `canAccessFounderPortal()` requires founder authorization.
3. `checkRateLimit()` applies a per-user/per-client 20 request/minute brake.
4. A limited request receives `429` and `Retry-After`.

### Evidence

| Check | Result |
|---|---|
| Unauthenticated `POST /api/atlas` | **Pass** — `401`, `Sign in required.` |
| `npm run typecheck` | **Pass** |
| `npm run lint` | **Pass with existing unused-variable warning** |
| `npm run build` | **Pass** |

### Residual risk

Rate limiting is in-memory and therefore per-instance. It is sufficient to remove the unauthenticated quota path; shared-store rate limiting remains a non-blocking scale hardening item after certification blockers close.

---

## Phase 2 — Production Living Profile Migration

# **COMPLETED**

Authorized production access became available on 2026-08-03. Prerequisite
inspection found that production predates `public.coach_memory`; the original
migration would therefore have failed during its optional legacy backfill.
The migration now detects that optional source table before executing the
declared-field import. It does not create a second continuity store.

### Evidence

| Requirement | Result |
|---|---|
| Supabase CLI | **Pass** — 2.111.0 |
| Authorized project access | **Pass** — project `wudjmxqbsozreepgjvef`, `ACTIVE_HEALTHY` |
| Production prerequisites | **Pass** — `profiles`, `set_updated_at()`, and `is_founder_or_admin()` present |
| Optional backfill source | **Absent by inspection** — zero `coach_memory` rows eligible for import |
| Migration artifact | **Present:** `supabase/migrations/20260802_living_profiles.sql` |
| Migration output validation | **Pass:** `npm run db:living-profiles` emits table, RLS policy, and conditional backfill SQL |
| Transactional preflight | **Pass** — complete migration executed and rolled back |
| Production application | **Pass** — migration applied through the authorized Supabase Management API |
| Idempotency rerun | **Pass** — production rerun completed without schema or data error |
| Table controls | **Pass** — table present, RLS enabled, update trigger present |
| Ownership policy | **Pass** — `living_profiles_own` assigned to `authenticated` |
| Backfill result | **Pass** — zero rows imported because the inspected source table does not exist |
| Authenticated member lifecycle | **Pass** — create, read, update, and reset under member RLS |
| Cross-member write | **Pass** — rejected by RLS with PostgreSQL `42501` |
| Test-data cleanup | **Pass** — temporary auth user removed; cascaded profile and LP data removed |

### Recovery procedure

The migration is forward-recoverable and safe to rerun:

1. Stop application writes if a later verification check fails.
2. Preserve existing `living_profiles` rows; do not drop the SSOT table after
   member writes begin.
3. Correct the failed prerequisite and rerun the idempotent migration. Table
   creation, trigger replacement, policy replacement, and missing-row import
   are repeat-safe.
4. Re-run table, RLS, policy, trigger, row-count, and authenticated lifecycle
   checks before restoring writes.

Transactional rollback was tested before production application. Forward
recovery is preferred after application because dropping the table would
destroy member identity.

---

## Phase 3 — Dependency-Chain Route Enforcement

### Milestone 3.1 — Practice route server gate

# **COMPLETED**

`/app/practice` now waits for an incoming request and performs a secure
server-side readiness check before rendering coaching:

1. The request-boundary data access layer verifies the Supabase user.
2. It reads the canonical `living_profiles` row under member RLS.
3. It runs the same System 2 Adaptive Home model used by the member home.
4. Coaching renders only when the profile gate passes and Adaptive Home
   recommends `/app/practice`.
5. Missing authentication, incomplete identity, query failure, or unavailable
   configuration fails closed to `/app`.

The Living Profile API and route guard share one row mapper; no second profile
shape or readiness store was introduced.

### Evidence

| Check | Result |
|---|---|
| Priority revalidation | **Pass** — no mainline or newer PR direction supersedes Phase 3 |
| Incomplete/ready model exercise | **Pass** — incomplete profile denied; declared purpose allows `/app/practice` |
| Request-time rendering | **Pass** — Next build reports `ƒ /app/practice` |
| Prerender exclusion | **Pass** — no `/app/practice` prerender-manifest entry or cached redirect metadata |
| Unconfigured runtime request | **Pass** — request-time `307` to guarded auth path; no prerender header |
| `npm run typecheck` | **Pass** |
| `npm run lint` | **Pass with one pre-existing unused-variable warning** |
| `npm run build` | **Pass** — 54 routes |
| `git diff --check` | **Pass** |

### Boundary and residual verification

This milestone does not alter global navigation, Dashboard entry points,
Prepare, Training, or legacy mission routes. Those remain blocked from work
until Founder approval of this checkpoint.

The authenticated ready/incomplete production browser matrix was not executed:
this environment has no authorized test-member credentials, and no production
identity was created for route testing. The canonical model branches, server
boundary, fail-closed behavior, and request-time rendering are verified;
authenticated production journey evidence remains required for final Phase 3
re-certification.

### Milestone 3.2 — Remove global Practice entry

# **COMPLETED**

The primary application navigation no longer links directly to
`/app/practice`. Home remains the global entry into the frozen chain, and the
existing readiness-approved Adaptive Home recommendation remains unchanged.
Home, Profile, Activity, Progress, Settings, and conditional Founder Portal
navigation behavior is preserved.

### Evidence

| Check | Result |
|---|---|
| Priority revalidation | **Pass** — no mainline or newer PR direction supersedes Phase 3 |
| Navigation invariant | **Pass** — expected global links preserved; Practice absent |
| Scope review | **Pass** — one application file changed; no route or Prepare behavior changed |
| `npm run typecheck` | **Pass** |
| `npm run lint` | **Pass with one pre-existing unused-variable warning** |
| `npm run build` | **Pass** — 54 routes; `/app/practice` remains request-dynamic |
| `git diff --check` | **Pass** |

Authenticated browser inspection was not executed because this environment has
no Supabase test configuration or authorized test-member credentials. Source
invariant validation and the production build verify the bounded navigation
change; authenticated browser evidence remains required for final Phase 3
re-certification.

### Milestone 3.3 — Legacy and Prepare route enforcement

# **COMPLETED**

Prepare, Training, and the six legacy mission entry points now return temporary
redirects to `/app`, where Adaptive Home runs the approved readiness chain.
Both historical root aliases and matching `/app/*` paths are covered. Existing
page implementations remain intact and no unrelated route behavior changed.

### Evidence

| Check | Result |
|---|---|
| Priority revalidation | **Pass** — no mainline or newer PR direction supersedes Phase 3 |
| Redirect configuration | **Pass** — 16 scoped entries target `/app` with temporary redirects |
| Production HTTP matrix | **Pass** — all 16 entries return `307` with `Location: /app` |
| Query handling | **Pass** — incoming query values are preserved |
| Control routes | **Pass** — `/voice` and `/dashboard` retain their prior destinations |
| `npm run typecheck` | **Pass** |
| `npm run lint` | **Pass with one pre-existing unused-variable warning** |
| `npm run build` | **Pass** — 54 routes; `/app/practice` remains request-dynamic |
| `git diff --check` | **Pass** |

### Rollback

Remove the 16 scoped redirect rules from `next.config.ts` and restore the eight
historical alias destinations. The underlying page implementations were not
deleted or modified, so rollback requires no data migration or component
reconstruction. Redirects are temporary (`307`) and therefore are not
permanently cached by clients.

---

## Phase 3 Certification Determination

# **CERTIFIED WITH DOCUMENTED VERIFICATION DEPENDENCY**

Founder approval on 2026-08-03 closes Phase 3. Repository, build, model,
request-boundary, redirect-configuration, and production HTTP evidence satisfy
the approved implementation criteria.

The authenticated ready/incomplete production-browser matrix remains
unverified because the execution environment had neither Supabase test
configuration nor authorized test-member credentials. This is a documented
verification dependency, not authorization to reopen or extend HARDEN-001.
Future production-browser evidence must be recorded in a separate
re-certification document.

---

## Successor Checkpoints — Not Started

The following work is outside this frozen record and must receive an independent
checkpoint document, scope, evidence set, approval gate, and freeze:

- Phase 4 — identity integrity
- Phase 5 — reset and lifecycle integrity
- Phase 6 — authentication and ownership hardening
- Phase 7 — registry integrity

---

## Final Disposition

# **NO-GO**

Phase 3 is officially complete and this certification is frozen. Feature
development remains blocked because the later EXEC-VERIFY-001 hardening phases
are outside this certification and remain incomplete. Phase 4 was not started.
FREEZE-001 remains active until focused re-certification and explicit Founder
release.
