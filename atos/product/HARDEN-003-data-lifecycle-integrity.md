# HARDEN-003 — Data Lifecycle Integrity

| Field | Value |
|---|---|
| **Document ID** | HARDEN-003 |
| **Version** | 0.2.0 |
| **Date** | 2026-08-03 |
| **Status** | **Milestone 5.1 complete — Founder approval gate** |
| **Scope** | Member data lifecycle integrity only |
| **Governing certification** | [EXEC-VERIFY-001](EXEC-VERIFY-001-final-architecture-certification.md) — DATA-01 |
| **Prior certification** | [HARDEN-002](HARDEN-002-identity-integrity.md) — Frozen Historical |

---

## Mission

Make the member-initiated TalkForge reset complete, atomic, isolated, and
truthful without deleting the member's login account.

This checkpoint does not reopen HARDEN-002, authorize feature development, or
define a general account-deletion or regulatory-retention system.

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
