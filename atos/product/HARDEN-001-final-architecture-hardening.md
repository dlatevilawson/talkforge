# HARDEN-001 — Final Architecture Hardening

| Field | Value |
|---|---|
| **Document ID** | HARDEN-001 |
| **Version** | 1.0.0 |
| **Date** | 2026-08-02 |
| **Status** | **Halted at Phase 2 — production migration credentials unavailable** |
| **Governing certification** | [EXEC-VERIFY-001](EXEC-VERIFY-001-final-architecture-certification.md) |

---

## Mission

Eliminate certified blockers in strict order. This is a hardening record, not a feature plan.

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

# **FAILED — STOP**

The required production migration could not be applied or verified from this environment.

### Evidence

| Requirement | Result |
|---|---|
| Supabase CLI | **Unavailable** |
| `SUPABASE_DB_URL` | **Absent** |
| `SUPABASE_ACCESS_TOKEN` | **Absent** |
| `SUPABASE_SERVICE_ROLE_KEY` | **Absent** |
| Migration artifact | **Present:** `supabase/migrations/20260802_living_profiles.sql` |
| Migration output validation | **Pass:** `npm run db:living-profiles` emits table, RLS policy, and backfill SQL |
| Production application / policy verification / backfill evidence | **Not performed** |

### Required operator action

Apply `supabase/migrations/20260802_living_profiles.sql` using an authorized production Supabase workflow, then provide:

1. Migration execution result.
2. `living_profiles` table and `living_profiles_own` policy verification.
3. Backfill row-count/result verification.
4. Authenticated member create/read/update/reset proof.
5. Tested rollback procedure or a documented, approved forward-recovery procedure.

---

## Phases Not Started

Per EXEC-HARDEN-001 strict ordering, these phases were intentionally not started:

- Phase 3 — dependency-chain route enforcement
- Phase 4 — identity integrity
- Phase 5 — reset and lifecycle integrity
- Phase 6 — authentication and ownership hardening
- Phase 7 — registry integrity

---

## Final Recommendation

# **NO-GO**

Feature development remains blocked. Phase 1 removes the Atlas quota blocker, but the Living Profile SSOT cannot be certified until its production migration is applied and verified. Resume EXEC-HARDEN-001 at Phase 2 only after authorized migration access is available.
