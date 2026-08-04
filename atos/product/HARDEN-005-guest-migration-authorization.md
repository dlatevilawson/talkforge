# HARDEN-005 — Guest Migration Authorization

| Field | Value |
|---|---|
| **Document ID** | HARDEN-005 |
| **Version** | 0.1.0 |
| **Date** | 2026-08-04 |
| **Status** | **Milestone 7.1 in progress** |
| **Scope** | Retirement of privileged guest migration authorization only |
| **Governing certification** | [EXEC-VERIFY-001](EXEC-VERIFY-001-final-architecture-certification.md) — SEC-04 / required fix #7 |
| **Prior certification** | [HARDEN-004](HARDEN-004-schema-deployment-integrity.md) — Frozen Historical |

---

## Mission

Eliminate the unnecessary service-role guest-migration authorization path while
preserving legitimate migration of member-owned browser data on the same
device.

HARDEN-005 does not reopen HARDEN-001 through HARDEN-004. It does not authorize
archive recovery, proof-token infrastructure, account changes, general CSRF
work, feature development, or remediation of another security finding.

Any future archive recovery workflow requires a separate Founder-approved
checkpoint with an explicit proof-of-possession design.

---

## Milestone sequence

| Milestone | Purpose | Gate |
|---|---|---|
| **7.1 — Threat Model and Retirement Contract** | Record the exploit, production state, trust boundary, and binding retirement decision. | Founder certification |
| **7.2 — Application Retirement** | Remove privileged reassignment, preserve local-device migration, and give stale clients an explicit retired response. | Founder certification |
| **7.3 — Authorization Gates** | Make body-trusted/admin guest reassignment fail automated checks and verify local isolation. | Founder certification |
| **7.4 — Production Certification** | Verify retired production behavior and unchanged archives, then freeze HARDEN-005. | Founder final certification |

No milestone begins before the prior milestone passes its Founder Gate.

---

## Milestone 7.1 — Threat Model and Retirement Contract

### Finding

`POST /api/auth/migrate-guest` authenticates the member but accepts `guestId`
from JSON as the authorization target. It then uses the Supabase service role to
update `practice_sessions` and `reflections` and delete a matching `profiles`
row.

The `guest_` prefix validates syntax only. It does not prove that the caller
owns the supplied guest identity. A signed-in attacker who learns another
legacy guest id can request cross-tenant reassignment. This is an authenticated
IDOR design even where current database types make the request a no-op.

### Trust-boundary analysis

| Input / capability | Trust classification | Decision |
|---|---|---|
| Supabase authenticated session | Trusted for the member's `auth.uid()` only | May identify the destination member, not a guest source. |
| JSON `guestId` | Untrusted client input | Must never authorize a service-role write. |
| `sessionStorage` current guest id | Untrusted browser state | May select local records on that device only. |
| `localStorage` pending guest id | Untrusted browser state | May select local records on that device only. |
| Service-role Supabase client | Privileged server capability | Must not be used for guest reassignment in this checkpoint. |
| Legacy archive rows | Segregated historical data | Preserve without read, write, restore, or delete behavior. |

### Production inventory

Read-only production catalog verification on 2026-08-04 returned:

| Resource | Production state |
|---|---|
| `public.profiles.id` | `uuid` |
| `public.practice_sessions.user_id` | `uuid` |
| `public.reflections.user_id` | `uuid` |
| `public.legacy_guest_profiles` | 35 archived rows |
| `public.legacy_guest_practice_sessions` | 25 archived rows |
| `public.legacy_guest_reflections` | 2 archived rows |

Active UUID columns cannot contain `guest_*` identifiers. The shipping
privileged route therefore cannot recover the archived records it purports to
migrate. Keeping its service-role reassignment capability creates
authorization risk without a valid production migration target.

### Binding retirement contract

The following decisions are normative for HARDEN-005:

1. **Cloud guest reassignment is retired.** No authenticated request may move
   active or archived cloud rows based on a client-provided guest id.
2. **The existing endpoint becomes inert.** During Milestone 7.2 it will retain
   an explicit response for stale clients but will import no admin client,
   parse no authorization target, and perform no database mutation.
3. **Local-device migration remains.** Browser records keyed to the pending
   guest id may be reassigned to the authenticated member on the same device.
   This grants no cloud or cross-device authority.
4. **Archives are immutable in this checkpoint.** The three
   `legacy_guest_*` tables are not queried, modified, deleted, restored, or
   exposed to members.
5. **No proof system is introduced.** Cookies, HMAC tokens, pending-binding
   tables, resource-id capabilities, and support recovery flows are outside
   HARDEN-005.
6. **Future recovery requires a successor.** Any archive recovery mechanism
   requires a new Founder-approved checkpoint and explicit
   proof-of-possession design.
7. **No new database migration is required.** The active UUID schema and
   existing archives remain unchanged.

### Expected stale-client behavior

The retired endpoint will return a deterministic non-success response such as
HTTP `410 Gone` with a non-sensitive explanation that cloud guest migration is
retired. It will not reveal whether any guest id or archived row exists.

The current application client will stop calling the endpoint in Milestone 7.2.
Local reassignment will continue and pending browser state will be cleared only
after the local operation completes.

### Acceptance criteria

1. The IDOR exploit and service-role blast radius are explicitly documented.
2. Production active-column types and archive counts are verified read-only.
3. Local browser state is classified as authority for local records only.
4. Cloud reassignment retirement is selected over a new proof mechanism.
5. Stale-client, archive, local-device, and future-recovery behavior is
   unambiguous.
6. HARDEN-005 requires no schema migration.
7. HARDEN-001 through HARDEN-004 remain unchanged.
8. Typecheck, lint, production build, and diff integrity pass.

### Gate

# **IN PROGRESS**

Stop after Milestone 7.1 verification and await Founder approval. Do not begin
route or client retirement.
