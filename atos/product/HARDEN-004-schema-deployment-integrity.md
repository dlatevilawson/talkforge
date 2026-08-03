# HARDEN-004 — Schema Deployment Integrity

| Field | Value |
|---|---|
| **Document ID** | HARDEN-004 |
| **Version** | 1.0.0 |
| **Date** | 2026-08-03 |
| **Status** | **Frozen Historical — Phase 6 certified** |
| **Scope** | Database deployment integrity only |
| **Governing certification** | [EXEC-VERIFY-001](EXEC-VERIFY-001-final-architecture-certification.md) — SEC-02 / required fix #6 |
| **Prior certification** | [HARDEN-003](HARDEN-003-data-lifecycle-integrity.md) — Frozen Historical |
| **Frozen by** | Founder approval — 2026-08-03 |
| **Successor rule** | Future deployment-integrity changes require a new Founder-approved checkpoint |

---

## Mission

Make ordered migrations the single database deployment source of truth and
prevent repository drift from reintroducing security defects.

This checkpoint does not reopen HARDEN-001 through HARDEN-003. It does not
authorize feature work, guest-migration changes, general security remediation,
application schema redesign, or data-lifecycle changes.

This document is now an immutable historical certification record. Corrections
require an explicit Founder-approved successor checkpoint or re-certification.

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

---

## Milestone 6.3 — Automated Drift Gates

# **COMPLETED**

### Objective

Make deployment-source, migration-order, effective-trigger security, and
reference-parity drift fail the repository's operational checks and production
build while removing remaining active alternate-deployment guidance.

### Implementation

1. Added `scripts/check-supabase-deployment.mjs`, which verifies:
   - all SQL migrations are covered by deterministic manifest paths;
   - each path contains no duplicate migration and exactly one bootstrap;
   - the effective `handle_new_user()` definition on every path uses app
     metadata and does not trust user-metadata role;
   - the non-deployable snapshot matches the certified secure trigger and reset
     function;
   - Living Profile version, CoachMemory learning-style, and unique waitlist
     reference invariants remain present;
   - standalone SQL is explicitly non-deployable; and
   - retired one-off helpers cannot emit SQL outside the manifest.
2. Added a negative self-test that injects an insecure effective trigger and
   proves the gate rejects it.
3. Added `npm run db:check` and `npm run db:check:self-test`.
4. `npm run build` and `npm run auth:check` now run `db:check`, making the gate
   part of Vercel/local production builds and auth verification.
5. Retired the Atlas and Living Profile partial SQL emitters. They print only
   manifest paths and explicitly refuse `--apply`.
6. Marked `supabase/waitlist.sql` non-deployable.
7. Updated active AUTH, TIP, and System 1 deployment guidance to select the
   exact manifest path and reject foundation-only or `schema.sql` deployment.

### Acceptance evidence

| Criterion | Result | Evidence |
|---|---|---|
| Positive deployment gate | **PASS** | `npm run db:check` validates 9 migrations across 2 paths. |
| Negative security test | **PASS** | `npm run db:check:self-test` rejects a synthetic insecure effective trigger. |
| Build enforcement | **PASS** | `npm run build` visibly runs `db:check` before Next.js compilation. |
| Auth enforcement | **PASS** | `npm run auth:check` runs `db:check` and all 13 TIP checks. |
| Deployable trigger coverage | **PASS** | TIP migration, production-upgrade migration, and reference snapshot all reject user-metadata role trust. |
| Alternate helper retirement | **PASS** | Both helpers print manifest paths only; Atlas `--apply` exits non-zero. |
| Standalone SQL demotion | **PASS** | Deployment gate accepts the non-deployable waitlist reference header. |
| Active documentation alignment | **PASS** | AUTH production/foundation, TIP readiness/deliverables, and System 1 point to the manifest contract. |
| Migration SQL unchanged | **PASS** | Diff verification covers `supabase/migrations/*`. |
| Reconciled snapshot unchanged | **PASS** | Diff verification covers `supabase/schema.sql`. |
| Frozen checkpoints unchanged | **PASS** | Diff verification covers HARDEN-001 through HARDEN-003. |
| Typecheck | **PASS** | `npm run typecheck`. |
| Lint | **PASS WITH PRE-EXISTING WARNING** | `npm run lint`; zero errors and one unrelated unused-import warning in `scripts/atos-check-m8.mjs`. |
| Production build | **PASS** | Gated Next.js 16.2.10 build compiled, typechecked, and generated all routes. |
| Diff integrity | **PASS** | `git diff --check`. |

### Residual risks

1. Direct invocation of `next build` bypasses package scripts; supported local
   and Vercel builds use `npm run build`.
2. The repository has no Supabase CLI migration ledger. Production state still
   requires read-only catalog verification in Milestone 6.4.
3. Historical certification/remediation documents retain time-bound evidence
   about former one-off commands; they are not active operator instructions.
4. The gate validates repository intent and critical parity, not a complete
   semantic equivalence proof for every SQL statement.

### Rollback

Revert the deployment checker, package-script integration, retired helper
behavior, standalone SQL header, and active documentation updates. No database
or application rollback is required. Rollback would remove the automated
SEC-02 regression barrier.

### Gate

# **NO-GO**

Milestone 6.3 stops at the Founder checkpoint. Do not begin production
certification or freeze HARDEN-004 without explicit Founder approval.

---

## Milestone 6.4 — Production Certification

# **COMPLETED**

### Objective

Verify the certified migration contract against the live production catalog,
record final deployment-integrity evidence, and stop at the Founder Gate for
HARDEN-004 certification and freeze.

Milestone 6.4 is read-only. It does not apply SQL, alter production, modify
migrations, or change application behavior.

### Production evidence

The authorized production Supabase project reported `ACTIVE_HEALTHY`.
Read-only Management API catalog verification established:

| Production invariant | Result |
|---|---|
| Live `handle_new_user()` body matches the certified TIP secure-role migration | **PASS** |
| Trigger is `SECURITY DEFINER` with `search_path=public` | **PASS** |
| Both Auth lifecycle triggers are present and enabled | **PASS — 2/2** |
| Live `reset_my_talkforge_data()` body matches its certified migration | **PASS** |
| Reset remains `SECURITY INVOKER` | **PASS** |
| Reset execute: `anon` denied / `authenticated` granted | **PASS** |
| Manifest-head public tables present | **PASS — 12/12** |
| Active application tables have RLS enabled | **PASS — 9/9** |
| Living Profile `version bigint not null default 1` | **PASS** |
| `living_profiles_version_positive` exists and is validated | **PASS** |
| CoachMemory learning-style constraint exists and is validated | **PASS** |
| Waitlist staff-select policy exists | **PASS** |

Function-body verification compares normalized live `prosrc` to the exact
certified migration bodies. It does not infer security from names or comments.

### Repository evidence

| Criterion | Result |
|---|---|
| `npm run db:check` | **PASS — 9 migrations / 2 paths** |
| `npm run db:check:self-test` | **PASS — insecure effective trigger rejected** |
| `npm run auth:check` | **PASS — deployment gate + 13 TIP checks** |
| Gated `npm run build` | **PASS** |
| Migration SQL unchanged | **PASS** |
| Reconciled snapshot unchanged | **PASS** |
| Frozen HARDEN-001 through HARDEN-003 unchanged | **PASS** |

### Certification determination

# **CERTIFIED**

HARDEN-004 meets its approved objectives:

1. ordered migrations are the declared and machine-readable deployment SSOT;
2. alternate SQL artifacts are non-deployable and reconciled for review;
3. effective-role security and critical reference parity are automated build
   gates; and
4. the live production catalog matches the certified security and active
   schema contract.

This closes EXEC-VERIFY-001 SEC-02 / required fix #6 only. It does not resolve
guest migration, registry integrity, or any other required fix and does not
lift FREEZE-001 or the feature-development hold.

### Residual risks

1. No repository-managed Supabase migration ledger exists; manifest intent is
   certified through catalog evidence rather than applied-version rows.
2. The gate proves selected critical semantic parity, not equivalence for every
   possible SQL execution plan.
3. Unsupported direct commands can bypass package scripts; the documented and
   Vercel build path is gated.

### Rollback

Milestone 6.4 makes no runtime change and requires no production rollback.
Emergency rollback of earlier HARDEN-004 repository controls would reopen
SEC-02 redeployment risk and requires a new Founder-authorized checkpoint.

### Final Disposition

# **NO-GO**

Founder approval on 2026-08-03 closes Phase 6. HARDEN-004 is frozen and may not
be modified except through a future Founder-approved checkpoint. This
certification closes only EXEC-VERIFY-001 SEC-02 / required fix #6; the
feature-development hold remains in force.
