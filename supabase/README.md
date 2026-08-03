# TalkForge Database Deployment

## Single source of truth

The ordered SQL files in [`migrations/`](migrations/) are the **only deployment
source of truth** for the TalkForge database. Their supported order is declared
in [`migrations/manifest.json`](migrations/manifest.json).

`schema.sql` is a non-deployable reference snapshot. Do not run it against a
greenfield, staging, or production database. It contains historical
consolidation drift and cannot represent one-time upgrade or data-repair
migrations safely.

Standalone SQL files outside `migrations/`, including `waitlist.sql`, are not a
substitute deployment path.

## Select exactly one bootstrap path

### Greenfield database

Use `deploymentPaths.greenfield` from the manifest in its exact order.

The first two migrations are an inseparable security sequence:

1. `20260729_auth_foundation.sql`
2. `20260729_tip_secure_role_trigger.sql`

The foundation migration contains the historical pre-TIP trigger. A greenfield
deployment is not valid or secure until the TIP migration succeeds. Never admit
traffic between those two steps.

### Existing TalkForge production database

Use `deploymentPaths.existingProduction` from the manifest in its exact order,
applying only migrations that production verification shows are not already
present.

`20260730_upgrade_legacy_profiles.sql` is the existing-production bootstrap. It
contains the secure role trigger and replaces the greenfield foundation/TIP
pair. Do not apply both bootstrap paths to the same database.

Data-repair migrations must be preflighted and recorded before execution. They
must not be inferred from `schema.sql`.

## Security invariant

Any deployable `handle_new_user()` definition must:

- use `auth.users.raw_app_meta_data` for elevated role assignment;
- default unknown or absent roles to `user`; and
- never trust `raw_user_meta_data.role`.

The browser-controlled `raw_user_meta_data` may contain member profile fields,
but it is not authorization input.

## Operator rules

1. Identify the target as greenfield or existing production.
2. Read the corresponding manifest path.
3. Preflight the target schema and data before applying an unapplied migration.
4. Apply migrations in one controlled transaction when their DDL/data behavior
   permits it.
5. Verify security functions, RLS, tables, and constraints after deployment.
6. Record the exact files and evidence in the active HARDEN checkpoint.
7. Stop on any mismatch; do not repair drift by running `schema.sql`.

HARDEN-004 Milestone 6.1 declares this contract. Later HARDEN-004 milestones
reconcile the reference snapshot, align scripts and documentation, add
automated drift gates, and certify production.
