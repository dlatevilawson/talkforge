# HARDEN-004 — Schema Deployment Integrity

| Field | Value |
|---|---|
| **Document ID** | HARDEN-004 |
| **Version** | 0.1.0 |
| **Date** | 2026-08-03 |
| **Status** | **Milestone 6.1 in progress** |
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

### Gate

# **IN PROGRESS**

Stop after Milestone 6.1 verification and await Founder approval. Do not begin
artifact reconciliation.
