# HARDEN-004 — Schema Deployment Integrity

| Field | Value |
|---|---|
| **Document ID** | HARDEN-004 |
| **Version** | 0.3.0 |
| **Date** | 2026-08-03 |
| **Status** | **Milestone 6.2 complete — Founder approval gate** |
| **Scope** | Database deployment integrity only |
| **Governing certification** | [EXEC-VERIFY-001](EXEC-VERIFY-001-final-architecture-certification.md) — SEC-02 / required fix #6 |
| **Prior certification** | [HARDEN-003](HARDEN-003-data-lifecycle-integrity.md) — Frozen Historical |

---

## Mission

Make ordered migrations the single database deployment source of truth and
prevent repository drift from reintroducing security defects.

This checkpoint does not reopen HARDEN-001 through HARDEN-003. It does not
authorize feature work, guest-migration changes, general security remediation,
application schema redesign, or data-lifecycle changes.

---

## Milestone sequence

| Milestone | Purpose | Gate |
|---|---|---|
| **6.1 — Deployment SSOT Declaration** | Declare migration paths, ordering, bootstrap boundaries, and non-deployable artifacts. | Founder certification |
| **6.2 — Artifact Reconciliation** | Reconcile or demote stale schema artifacts without changing production semantics. | Founder certification |
| **6.3 — Automated Drift Gates** | Align operational documentation/scripts and make insecure or incomplete deployable SQL fail verification. | Founder certification |
| **6.4 — Production Certification** | Verify live security semantics, certify the deployment contract, and freeze HARDEN-004. | Founder final certification |

No milestone begins before the prior milestone passes its Founder Gate.

---

## Milestone 6.1 — Deployment SSOT Declaration

### Objective

Publish one unambiguous deployment contract:

- `supabase/migrations/` is the only deployment source of truth;
- `supabase/migrations/manifest.json` defines the supported order;
- greenfield and existing-production bootstraps are mutually exclusive;
- the secure role migration is mandatory on both paths; and
- `supabase/schema.sql` is a non-deployable reference snapshot.

### Priority verification

The live production `handle_new_user()` currently uses
`raw_app_meta_data`, does not trust `raw_user_meta_data.role`, and contains the
elevated-role allowlist. SEC-02 is therefore a repository/redeployment
regression risk, not evidence of an active production role-escalation defect.

### Acceptance criteria

1. Every SQL migration in the repository appears in at least one supported
   manifest path.
2. Each path has a deterministic order and exactly one bootstrap strategy.
3. Greenfield deployment requires the TIP secure-role migration immediately
   after the historical auth foundation and admits no traffic between them.
4. Existing production uses the legacy-upgrade bootstrap that embeds the
   secure trigger and does not apply the greenfield bootstrap.
5. `schema.sql` and standalone SQL files are explicitly non-authoritative.
6. The required and forbidden role-metadata sources are machine-readable.
7. Operator instructions require preflight, post-deployment verification, and
   evidence in the active HARDEN checkpoint.
8. No frozen HARDEN checkpoint, production schema, application code, or
   migration SQL is modified.
9. Manifest verification, typecheck, lint, and production build pass.

### Implementation

1. `supabase/migrations/manifest.json` now defines two deterministic,
   mutually-exclusive deployment paths:
   - **greenfield**, beginning with the auth foundation immediately followed by
     the mandatory TIP secure-role migration; and
   - **existing production**, beginning with the legacy-upgrade migration that
     embeds the secure trigger.
2. The manifest identifies `supabase/migrations/` as the deployment SSOT,
   classifies `supabase/schema.sql` as non-deployable, and records the required
   and forbidden authorization metadata sources.
3. `supabase/README.md` defines operator preflight, ordering, transaction,
   verification, evidence, and stop-on-drift rules.
4. The `schema.sql` header now blocks wholesale deployment and directs
   operators to the manifest. Its internal reconciliation remains Milestone
   6.2.
5. `AGENTS.md` binds agents to the same deployment rule.

### Acceptance evidence

| Criterion | Result | Evidence |
|---|---|---|
| Complete migration inventory | **PASS** | Executed manifest verifier found all 9 SQL migrations covered by at least one path. |
| Deterministic unique paths | **PASS** | Verifier found no duplicate file in either path. |
| Exclusive bootstrap strategies | **PASS** | Greenfield contains foundation/TIP only; existing production contains legacy upgrade only. |
| Mandatory greenfield security order | **PASS** | Foundation and TIP are manifest positions 1 and 2. |
| Non-deployable snapshot | **PASS** | Manifest, Supabase README, schema header, and AGENTS rule agree. |
| Machine-readable role invariant | **PASS** | Manifest forbids `raw_user_meta_data.role` and requires `raw_app_meta_data.role`. |
| Live production posture | **PASS** | Read-only catalog verification confirms `handle_new_user()` uses app metadata, does not trust user-metadata role, and retains the elevated-role allowlist. |
| Frozen checkpoints unchanged | **PASS** | Diff verification covers HARDEN-001 through HARDEN-003. |
| Migration SQL unchanged | **PASS** | Diff verification covers every `supabase/migrations/*.sql` file. |
| Typecheck | **PASS** | `npm run typecheck`. |
| Lint | **PASS WITH PRE-EXISTING WARNING** | `npm run lint`; zero errors and one unrelated unused-import warning in `scripts/atos-check-m8.mjs`. |
| Production build | **PASS** | `npm run build`; Next.js 16.2.10 compiled, typechecked, and generated all routes. |
| Diff integrity | **PASS** | `git diff --check`. |

### Residual risks

1. `schema.sql` remains internally stale until Milestone 6.2; the new header
   prevents it from being represented as deployable.
2. Existing scripts and older documents may still point at stale paths until
   Milestone 6.3.
3. The manifest is not yet enforced automatically in repository checks;
   Milestone 6.3 owns that gate.
4. Production has no repository-managed migration ledger. Operators must
   preflight existing production and record evidence until later checkpoint
   scope explicitly changes that mechanism.

### Rollback

Revert the manifest, operator README, schema warning header, and AGENTS binding.
No production or migration rollback is required because Milestone 6.1 changes
deployment declarations only. Rollback would reopen SEC-02 redeployment risk.

### Gate

# **NO-GO**

Milestone 6.1 stops at the Founder checkpoint. Do not begin artifact
reconciliation without explicit Founder approval.

---

## Milestone 6.2 — Artifact Reconciliation

# **COMPLETED**

### Objective

Reconcile security-sensitive and active declarative objects in the
non-deployable `schema.sql` reference snapshot without changing migration SQL,
production semantics, or application behavior.

### Implementation

1. Replaced the stale reference `handle_new_user()` body with the certified TIP
   secure-role definition:
   - browser-controlled user metadata remains limited to profile fields;
   - elevated roles come only from app metadata and the explicit allowlist; and
   - conflict updates cannot downgrade or self-elevate roles.
2. Added the Living Profile optimistic-concurrency `version` column, positive
   constraint, and column comment.
3. Added the certified `reset_my_talkforge_data()` definition, `SECURITY
   INVOKER` semantics, and `anon`/`authenticated` privilege boundary.
4. Restored the CoachMemory `learning_style` check constraint.
5. Removed the duplicated waitlist table/index/RLS/policy block while retaining
   the single complete waitlist definition and staff-select policy.
6. Documented the snapshot boundary: active declarative objects are represented
   for review; bootstrap order, legacy archives/helpers, one-time data repairs,
   and deployment evidence remain migration-only.

### Acceptance evidence

| Criterion | Result | Evidence |
|---|---|---|
| Secure trigger parity | **PASS** | Normalized function comparison matches `20260729_tip_secure_role_trigger.sql`; no user-metadata role read remains. |
| Reset function parity | **PASS** | Normalized function comparison matches `20260803_atomic_member_data_reset.sql`. |
| Living Profile version parity | **PASS** | Snapshot contains default `1`, named positive constraint, and concurrency comment. |
| CoachMemory constraint parity | **PASS** | Invalid learning style raised a check violation in isolated execution. |
| Duplicate waitlist removed | **PASS** | Exactly one `waitlist_members` table definition remains. |
| Snapshot compilation | **PASS** | Transformed snapshot compiled in isolated schemas inside a rolled-back production transaction. |
| Trigger security behavior | **PASS** | Isolated trigger test kept user-metadata `founder` at `user` and accepted app-metadata `founder`. |
| Reset privilege behavior | **PASS** | Isolated catalog test denied `anon` and granted `authenticated`. |
| Production unchanged | **PASS** | All database execution occurred in explicitly rolled-back isolated schemas. |
| Migration SQL unchanged | **PASS** | Diff verification covers `supabase/migrations/*`. |
| Frozen checkpoints unchanged | **PASS** | Diff verification covers HARDEN-001 through HARDEN-003. |
| Typecheck | **PASS** | `npm run typecheck`. |
| Lint | **PASS WITH PRE-EXISTING WARNING** | `npm run lint`; zero errors and one unrelated unused-import warning in `scripts/atos-check-m8.mjs`. |
| Production build | **PASS** | `npm run build`; Next.js 16.2.10 compiled, typechecked, and generated all routes. |
| Diff integrity | **PASS** | `git diff --check`. |

### Residual risks

1. `schema.sql` remains intentionally non-deployable and cannot encode
   mutually-exclusive bootstraps or one-time data repairs.
2. Reference parity is not yet an automated repository gate; Milestone 6.3 owns
   that enforcement.
3. Existing helper scripts and older documents may still imply alternate
   deployment paths until Milestone 6.3.
4. Legacy archive tables are intentionally migration-only and are not depicted
   in the active reference snapshot.

### Rollback

Revert the Milestone 6.2 snapshot and boundary-document changes. No production,
migration, or application rollback is required. Rollback would restore the
known SEC-02 reference hazard and is suitable only for emergency repository
recovery.

### Gate

# **NO-GO**

Milestone 6.2 stops at the Founder checkpoint. Do not begin script,
documentation, or automated drift-gate work without explicit Founder approval.
