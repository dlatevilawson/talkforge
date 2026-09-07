# Assistant Coach — deterministic wizard

Decision 060 defines one active first-user path:

**Pick your moments → Narrow the context → verify the deterministic profile → authenticate → activate → contextual Forge.**

## Active runtime

| Area | Contract |
|---|---|
| Public page | `/coach` three-phase card wizard |
| Public APIs | `/api/assistant-coach/session` and `/api/assistant-coach/profile` |
| Auth boundary | Exact return to protected `/coach/activate`; continuity-only soft email verification |
| Guest continuity | Signed HttpOnly anonymous cookie, server session/draft, 14-day TTL |
| Profile | Exact catalogs and deterministic projection in `practice-profile.ts` |
| Activation | Same-user ownership transfer and authorized `member_practice_profile` Living Profile write |
| Forge handoff | Marker-only `/app/practice?source=coach_wizard&start=1`; context reloads from the authenticated Living Profile |
| Lifecycle | Expired unactivated drafts purge through the existing reset lifecycle |

The wizard stores only provisional member declarations before authentication.
Activation validates the verified draft, preserves unrelated Living Profile
fields, records member provenance, and transfers ownership idempotently. Forge
reads the structured topic, audience, pattern, and urgency; it never writes
identity.

Soft email verification applies only after authentication to
`/coach/activate` and `/app/practice?source=coach_wizard`. It preserves the
first Forge handoff; it does not bypass authentication, account status,
onboarding, Living Profile readiness, entitlement, or server-authoritative
Realtime checks.

Historical `gated` session rows remain covered by the deployed non-destructive
schema/index. Session restore may find an unowned, unexpired row in that status
and heal it to `active`; this is storage recovery only and carries no value,
turn, or conversion semantics.

The former conversational discovery, model-generated discovery response,
anonymous coaching endpoints, browser recording path, value/conversion logic,
and repeated post-auth review are retired. Historical database fields remain
non-destructively for deployment compatibility but have no application
runtime.

Assessment remains independent and continues to use its own Realtime audio and
transcription infrastructure.
