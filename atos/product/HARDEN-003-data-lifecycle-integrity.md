# HARDEN-003 — Data Lifecycle Integrity

| Field | Value |
|---|---|
| **Document ID** | HARDEN-003 |
| **Version** | 1.0.0 |
| **Date** | 2026-08-03 |
| **Status** | **Frozen Historical — Phase 5 certified** |
| **Scope** | Member data lifecycle integrity only |
| **Governing certification** | [EXEC-VERIFY-001](EXEC-VERIFY-001-final-architecture-certification.md) — DATA-01 |
| **Prior certification** | [HARDEN-002](HARDEN-002-identity-integrity.md) — Frozen Historical |
| **Frozen by** | Founder-authorized Milestone 5.3 — 2026-08-03 |
| **Successor rule** | Later architecture work requires a separate checkpoint document |

---

## Mission

Make the member-initiated TalkForge reset complete, atomic, isolated, and
truthful without deleting the member's login account.

This checkpoint does not reopen HARDEN-002, authorize feature development, or
define a general account-deletion or regulatory-retention system.

This document is now an immutable historical certification record. Corrections
require an explicit Founder-authorized erratum or a separate re-certification
document.

---

## Formal Member Data Inventory

### Classification contract

| Classification | Binding meaning for this checkpoint |
|---|---|
| **Delete** | The completed reset must remove the resource for the requesting member. |
| **Retain** | The reset must leave the resource unchanged so the login account or non-coaching preference remains valid. |
| **Archive** | The resource is already segregated historical data. The reset neither restores nor destroys it. |
| **Out of Scope** | The resource is not member-owned coaching data or is controlled by a separate system or retention policy. |

The reset boundary is **all active TalkForge identity, coaching, practice, and
reflection data owned by the authenticated member**. It is not deletion of the
Supabase Auth account. No active coaching record may be silently retained or
converted into an archive by the reset.

### Supabase Auth and account resources

| Resource | Ownership / contents | Classification | Required behavior |
|---|---|---|---|
| `auth.users` | Member UUID, email, credentials, auth metadata | **Retain** | Preserve the login account and its UUID. |
| Supabase Auth session cookies | Session and refresh credentials for the member | **Delete** | Milestone 5.2 signs out only after the reset succeeds. |
| `public.profiles` | Account status, authorization role, display/account metadata, onboarding state | **Retain** | Preserve the account row and all authorization fields. |

`public.profiles.display_name` is account metadata for this checkpoint.
`public.living_profiles.display_name` is part of the identity SSOT and is
deleted with the Living Profile.

### Active server-side member resources

| Resource | Ownership / contents | Classification | Required behavior |
|---|---|---|---|
| `public.living_profiles` | `user_id`; identity fields; preferences; provenance; mattering conversation references | **Delete** | Delete the complete row. Do not preserve or promote selected claims. |
| `public.coach_memory` | `user_id`; continuity state, coaching history, notes, preferences, prior-session summaries | **Delete** | Delete the complete row. |
| `public.practice_sessions` | `user_id`; scenarios, turns, scores, modality, duration, timestamps | **Delete** | Delete every row owned by the member, including any member-linked synthetic scenario row. |
| `public.session_reports` | `user_id`; transcript, skill scores, coach summary, breakthrough, homework | **Delete** | Delete every row owned by the member; session cascade may enforce this. |
| `public.reflections` | `user_id`; reflection answers and satisfaction | **Delete** | Delete every row owned by the member; session cascade may enforce this. |

The operation must target `auth.uid()` only. Founder or administrator read
authority must not permit resetting another member's rows.

### Member-linked browser resources

| Resource | Contents | Classification | Required behavior |
|---|---|---|---|
| `sessionStorage["talkforge:currentUserId"]` | Current member/guest pointer | **Delete** | Clear after the server reset succeeds. |
| `localStorage["talkforge:pendingGuestUserId"]` | Pending legacy guest migration pointer | **Delete** | Clear after the server reset succeeds. |
| `localStorage["talkforge.forge_events.v1"]` | Member Forge events | **Delete** | Remove records for the member in Milestone 5.2. |
| `localStorage["talkforge.session_event_links.v1"]` | Member session/event links | **Delete** | Remove records for the member in Milestone 5.2. |
| `localStorage["talkforge.reality_captures.v1"]` | Member reality captures | **Delete** | Remove records for the member in Milestone 5.2. |
| `localStorage["talkforge.ce_transcripts.v1"]` | Device-local voice transcripts and coach history; records have no member key | **Delete** | Clear the store on the resetting device in Milestone 5.2. |
| `localStorage["talkforge.ce_active_voice_session.v1"]` | Active voice-session pointer | **Delete** | Clear on the resetting device in Milestone 5.2. |
| `localStorage["tf_beta_welcomed"]` | Device-level welcome dismissal | **Retain** | It is a non-coaching UX preference. |
| React in-memory profile/session state | Current page state | **Delete** | Navigation and sign-out discard it after success. |

Device-local data on another browser cannot be reached by a server reset. The
Milestone 5.2 UI must not claim cross-device browser-storage erasure.

### Archived resources

| Resource | Contents | Classification | Required behavior |
|---|---|---|---|
| `public.legacy_guest_profiles` | Segregated guest/orphan profile snapshots | **Archive** | Remain segregated; never restore into the member account during reset. |
| `public.legacy_guest_practice_sessions` | Segregated guest/orphan session snapshots | **Archive** | Remain segregated and inactive. |
| `public.legacy_guest_reflections` | Segregated guest/orphan reflection snapshots | **Archive** | Remain segregated and inactive. |

These tables have no authenticated-member foreign key. Their production access
controls require separate security verification; HARDEN-003 does not change
their retention.

### Explicitly out-of-scope resources

| Resource | Reason | Classification |
|---|---|---|
| `public.waitlist_members` | Email-linked acquisition record, not member-owned coaching data | **Out of Scope** |
| `public.founder_notes` | Company operating record with no member owner | **Out of Scope** |
| `public.founder_briefs` | Company operating record with no member owner | **Out of Scope** |
| OpenAI request/session retention | Vendor-controlled processing and retention | **Out of Scope** |
| Analytics events and operational logs | Separate observability/retention systems | **Out of Scope** |
| In-memory rate-limit buckets | Ephemeral infrastructure state | **Out of Scope** |
| Undocumented production-only tables or storage buckets | Not present in the repository contract | **Out of Scope pending production inventory verification** |

No Supabase Storage bucket or Edge Function persistence is declared in this
repository.

### Inventory decision

The inventory authorizes Milestone 5.1 to delete the five active server-side
resources in one authenticated transaction while retaining `auth.users` and
`public.profiles`. Browser deletion, truthful copy, and sign-out remain
Milestone 5.2 and are not part of Milestone 5.1.

---

## Milestone 5.1 — Atomic Server-Side Reset

### Objective

Provide one authenticated database operation that atomically deletes the
requesting member's Living Profile, CoachMemory, sessions, reports, and
reflections while preserving the login account and account profile.

### Acceptance criteria

1. The operation derives ownership only from `auth.uid()` and rejects an
   unauthenticated caller.
2. It deletes only the requesting member's five active server-side resource
   classes listed in the inventory.
3. `auth.users` and `public.profiles` remain unchanged.
4. Another member's rows remain unchanged, including when the caller has a
   founder or administrator role.
5. All deletes commit atomically or all roll back.
6. Repeating the operation is safe and reports zero additional deletions.
7. The callable surface is granted only to `authenticated`.
8. Migration verification, typecheck, lint, and build pass.

### Implementation

`20260803_atomic_member_data_reset.sql` adds
`public.reset_my_talkforge_data()`. The `SECURITY INVOKER` function:

- derives its only target UUID from `auth.uid()`;
- rejects a missing authenticated identity with SQLSTATE `28000`;
- deletes reflections, session reports, practice sessions, CoachMemory, and
  Living Profile rows for that UUID in one function invocation;
- returns per-resource deletion counts so callers can verify the result;
- is idempotent; and
- revokes execution from `public` and `anon`, granting it only to
  `authenticated`.

The function does not accept a user identifier. Elevated staff read authority
therefore cannot be used to select another member as the reset target.

### Acceptance evidence

| Criterion | Result | Evidence |
|---|---|---|
| Authenticated ownership and unauthenticated rejection | **PASS** | Isolated database verification set two identities, rejected a null identity, and compiled the migration function. |
| Five resource classes deleted | **PASS** | Runtime SQL verification returned `1` Living Profile, `1` CoachMemory, `2` sessions, `2` reports, and `2` reflections for the caller. |
| Account resources retained | **PASS** | Both test Auth-account and account-profile rows remained after reset. |
| Cross-member isolation | **PASS** | Every row for the second identity remained unchanged while the privileged test connection invoked the caller-bound function. |
| Atomic rollback | **PASS** | An injected CoachMemory delete failure restored all five resource classes; no partial deletion escaped. |
| Idempotence | **PASS** | A second invocation returned zero for all five deletion counts. |
| Least-privilege callable surface | **PASS** | Database catalog verification confirmed `anon` denied, `authenticated` granted, and `SECURITY INVOKER`. |
| Typecheck | **PASS** | `npm run typecheck`. |
| Lint | **PASS WITH PRE-EXISTING WARNING** | `npm run lint`; zero errors and one unrelated unused-import warning in `scripts/atos-check-m8.mjs`. |
| Production build | **PASS** | `npm run build`; Next.js 16.2.10 compiled, typechecked, and generated all routes. |
| Diff integrity | **PASS** | `git diff --check`. |

Database behavior tests ran in isolated schemas inside explicitly rolled-back
transactions. They did not alter production member rows or install the
migration in production.

### Residual risks

1. Production schema drift could prevent migration deployment; production
   application and verification remain required before Milestone 5.3
   certification.
2. Milestone 5.1 does not wire the UI to the function. The existing partial
   client reset remains unchanged until Milestone 5.2.
3. Browser-local coaching data remains until Milestone 5.2.
4. A database owner can always bypass grants; the callable application surface
   is nevertheless restricted to `authenticated`.

### Rollback

Revoke execute and drop `public.reset_my_talkforge_data()`. Milestone 5.1 does
not mutate existing member data during migration, so rollback requires no data
repair. The incomplete pre-existing client reset remains available until
Milestone 5.2 replaces it.

### Gate

# **NO-GO**

Milestone 5.1 stops at the Founder checkpoint. Do not begin Milestone 5.2
without explicit Founder approval.

---

## Milestone 5.2 — Application Integration

# **COMPLETED**

### Objective

Replace the misleading partial client reset with the certified Milestone 5.1
operation, complete the browser-data actions fixed by the Member Data
Inventory, and communicate the retained-account and device boundary truthfully.

### Implementation

1. `clearAllTalkForgeData()` now requires an authenticated Supabase user and
   invokes `reset_my_talkforge_data`; it no longer issues independent table
   deletes.
2. Browser cleanup starts only after the RPC succeeds:
   - member-keyed Forge events, session links, and reality captures are removed
     without affecting another member's records;
   - device-local unkeyed voice transcripts and the active voice pointer are
     cleared;
   - current-user and pending-guest pointers are cleared; and
   - the non-coaching beta-welcome preference is retained.
3. Current-user pointer notification is suppressed during reset so profile
   listeners cannot rebind it before sign-out.
4. Supabase sign-out runs only after cloud deletion and browser cleanup
   succeed. Partial browser-cleanup and sign-out failures report their actual
   state instead of claiming complete success.
5. The Profile UI now states exactly which TalkForge resources are deleted,
   that the login account remains, and that browser-only data on other devices
   cannot be reached.
6. The destructive button is disabled while reset is in flight and successful
   completion replaces the page with `/login`.

### Acceptance evidence

| Criterion | Result | Evidence |
|---|---|---|
| Certified operation used unchanged | **PASS** | Application contract check confirms the RPC precedes device cleanup and sign-out; Milestone 5.1 SQL and inventory are unchanged. |
| No partial table-delete path | **PASS** | `clearAllTalkForgeData()` contains no direct `practice_sessions` or `reflections` delete. |
| Server failure stops local deletion | **PASS** | RPC error is checked and thrown before any browser cleanup call. |
| Member-keyed browser isolation | **PASS** | Executed browser-storage harness deleted three member A records while retaining all member B records. |
| Unkeyed device data and identity pointers deleted | **PASS** | Harness removed transcript store, active voice pointer, current-user pointer, and pending-guest pointer. |
| Retained browser preference | **PASS** | Harness preserved `tf_beta_welcomed`. |
| Identity rebind race prevented | **PASS** | Harness confirmed reset pointer removal emits no pre-sign-out identity event. |
| Truthful UX and duplicate prevention | **PASS** | Contract check confirms account-retention, other-device limitation, disabled state, and login replacement. |
| Typecheck | **PASS** | `npm run typecheck`. |
| Lint | **PASS WITH PRE-EXISTING WARNING** | `npm run lint`; zero errors and one unrelated unused-import warning in `scripts/atos-check-m8.mjs`. |
| Production build | **PASS** | `npm run build`; Next.js 16.2.10 compiled, typechecked, and generated all routes. |
| CI | **PASS** | Vercel deployment and preview checks. |
| Diff integrity | **PASS** | `git diff --check`. |

Authenticated browser execution was attempted locally. The environment had no
configured authenticated Supabase session and correctly redirected
`/app/profile` to login, so destructive UI execution was not performed.
Production-authenticated and post-migration execution remains Milestone 5.3.

### Residual risks

1. Milestone 5.1 is not yet deployed to production, so the integrated RPC
   cannot complete there until the migration is applied.
2. Browser storage is device-local; another device must be cleared separately,
   as the UI now states.
3. Browser storage APIs are not transactional. If a device write fails after
   server deletion, the member receives an explicit partial-cleanup error and
   can retry the idempotent reset.
4. Authenticated end-to-end deletion, account retention, and fresh-state login
   require the controlled Milestone 5.3 production verification.

### Rollback

Revert the Milestone 5.2 application integration commit. No schema rollback is
required. Rollback restores the incomplete client delete and misleading copy,
so it is suitable only for emergency application recovery.

### Gate

# **NO-GO**

Milestone 5.2 stops at the Founder checkpoint. Do not begin Milestone 5.3
without explicit Founder approval.

---

## Milestone 5.3 — Production Verification and Certification

# **COMPLETED**

### Objective

Apply the certified lifecycle migrations, verify the complete reset against an
isolated authenticated production member, record browser evidence, and freeze
HARDEN-003. Milestone 5.3 makes no change to the certified deletion contract or
application integration.

### Production migration

Preflight found that production contained `living_profiles`,
`practice_sessions`, and `reflections`, but predated `coach_memory` and
`session_reports`. This matches the production dependency recorded in frozen
HARDEN-001.

The following existing certified migrations were applied to the production
Supabase project in one transaction:

1. `20260730_coach_memory_history.sql`
2. `20260731_coach_memory_phase1.sql`
3. `20260803_atomic_member_data_reset.sql`

Post-deployment catalog verification confirmed:

- `coach_memory`, `session_reports`, and `reset_my_talkforge_data()` exist;
- `anon` cannot execute the reset;
- `authenticated` can execute the reset; and
- the function remains `SECURITY INVOKER`.

### Authenticated production verification

An isolated production member was created through the Supabase Admin API. The
member was seeded with exactly one row in each active resource class and a
retained Auth/account pair:

| Resource before reset | Count |
|---|---:|
| `auth.users` | 1 |
| `public.profiles` | 1 |
| `public.living_profiles` | 1 |
| `public.coach_memory` | 1 |
| `public.practice_sessions` | 1 |
| `public.session_reports` | 1 |
| `public.reflections` | 1 |

The production browser walkthrough then:

1. authenticated as the isolated member;
2. displayed the seeded Living Profile and session history;
3. displayed the exact deletion, retained-account, and other-device boundary;
4. accepted the destructive confirmation;
5. redirected to `/login` after successful reset and sign-out;
6. re-authenticated with the same account; and
7. displayed zero sessions, empty Living Profile identity/coaching fields, and
   no prior session history while retaining the account display name.

The password was masked in the recording. The temporary `.test` member was
removed through the Admin API after evidence capture, and production
verification confirmed that no temporary Auth or profile row remained.

### Persistence evidence

Immediately after the browser reset and before test-account cleanup, production
returned:

| Resource after reset | Count |
|---|---:|
| `auth.users` | 1 |
| `public.profiles` | 1 |
| `public.living_profiles` | 0 |
| `public.coach_memory` | 0 |
| `public.practice_sessions` | 0 |
| `public.session_reports` | 0 |
| `public.reflections` | 0 |

This proves the active identity/coaching subtree was deleted and the login
account contract was retained.

### Acceptance evidence

| Criterion | Result |
|---|---|
| Certified contract and integration unchanged | **PASS** |
| Production prerequisites applied transactionally | **PASS** |
| Production function privilege boundary | **PASS** |
| Authenticated browser deletion | **PASS** |
| Successful sign-out and login redirect | **PASS** |
| Re-login with retained account | **PASS** |
| Fresh coaching state after re-login | **PASS** |
| Direct database deletion/retention counts | **PASS** |
| Temporary production test data removed | **PASS** |
| Walkthrough video captured and independently reviewed | **PASS** |

### Residual risks

1. Browser-only data on another device remains unreachable; the certified UI
   states this explicitly.
2. Vendor, analytics, operational-log, archive, and general account-deletion
   lifecycles remain outside the frozen Member Data Inventory boundary.
3. Browser storage APIs remain non-transactional; the application reports a
   partial device-cleanup failure and permits an idempotent retry.

### Rollback

The reset function can be disabled immediately by revoking execute from
`authenticated`. Application rollback may then revert Milestone 5.2. Do not
drop `coach_memory` or `session_reports`: they are pre-existing certified
application dependencies and may now contain production data.

---

## Phase 5 Certification Determination

# **CERTIFIED**

HARDEN-003 closes EXEC-VERIFY-001 DATA-01. The member reset is inventoried,
authenticated, caller-bound, atomic on the server, integrated with classified
browser cleanup, truthful about retention boundaries, and verified end to end
in production.

HARDEN-003 is frozen. Later evidence or lifecycle scope requires a separate
checkpoint or explicit Founder-authorized re-certification.

---

## Final Disposition

# **NO-GO**

Phase 5 data lifecycle integrity is complete. This certification closes only
DATA-01 and does not lift the governing EXEC-VERIFY-001 feature-development
hold, FREEZE-001, or any unresolved required fix.
