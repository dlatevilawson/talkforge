# AC-JOURNEY-001 — Deterministic first-user Coach card wizard (Phase 4A)

| Field | Value |
|---|---|
| **Document ID** | AC-JOURNEY-001 |
| **Status** | Working Knowledge — governance pivot approved (Decision 060); Phase 4B resequenced |
| **Plane** | Working Knowledge (not Canonical product doctrine) · implementation authorized for this track |
| **Idea Vault** | [IV-PROD-009](../knowledge/working/idea-vault/product-ideas/IV-PROD-009-first-user-assistant-coach-journey.md) · [IV-UX-011](../knowledge/working/idea-vault/ux-ideas/IV-UX-011-deterministic-coach-card-wizard.md) |
| **Blind spot** | [BS-018](../knowledge/working/blind-spot-register/bs-018.md) |
| **Owner** | Founder |
| **Created** | 2026-08-16 |
| **Updated** | 2026-09-07 |
| **Authority** | [Decision 060](../../atlas/decisions.md), superseding Decision 059 journey design · LP-LAW-001 · OWN-001 · FREEZE-001 |
| **Implementation** | Small slices per [PHASE4B-AC-IMPLEMENTATION-SEQUENCE](PHASE4B-AC-IMPLEMENTATION-SEQUENCE.md) |

---

## A. Controlling direction

Decision 059 remains the historical authorization for the Assistant Coach first-user track and its narrow exception to the general feature NO-GO. Formal Founder Decision 060 supersedes its active pre-account conversational discovery, discovery LLM, semantic `hasExperiencedValue` gate, anonymous Coach turns, turn-cap conversion, claim-then-confirm, and soft-verification continuity design.

The controlling path is:

**Pick your moments → Narrow the context → deterministic Living Profile verification → Looks right → authentication for guests → activation → contextual Forge.**

Decision 060 retains the signed HttpOnly cookie + server anonymous session, 14-day unclaimed TTL, no guest revival, Forge authentication requirement, Assessment demotion/retention, LP-LAW-001, OWN-001, and FREEZE-001. Frozen HARDEN checkpoints remain unchanged.

There is no desired-outcome field or question in this wizard.

---

## B. Stable option catalog

Labels are product contract. Stable IDs are persisted/API values and must not be silently renamed.

### B.1 Topics

| Stable ID | Exact label |
|---|---|
| `job_interview` | Job interview |
| `salary_raise_negotiation` | Salary / raise negotiation |
| `giving_difficult_feedback` | Giving difficult feedback |
| `setting_a_boundary` | Setting a boundary |
| `pitch_or_presentation` | Pitch or presentation |
| `handling_conflict` | Handling conflict |
| `asking_for_something_i_need` | Asking for something I need |
| `receiving_critical_feedback` | Receiving critical feedback |
| `ending_a_relationship` | Ending a relationship |
| `something_else` | Something else |

Topic selection is ordered multi-select with minimum 1 and maximum 3. Only `something_else` may reveal bounded custom text. Custom text does not create a new catalog ID.

### B.2 Audiences

| Stable ID | Exact label |
|---|---|
| `manager_boss` | Manager/boss |
| `peer_colleague` | Peer/colleague |
| `client_customer` | Client/customer |
| `recruiter_hr` | Recruiter/HR |
| `business_partner` | Business partner |
| `family_friend` | Family/friend |
| `stranger_new_contact` | Stranger/new contact |

Audience selection is ordered multi-select.

### B.3 Patterns

| Stable ID | Exact label |
|---|---|
| `freeze` | I freeze and don't know what to say |
| `ramble` | I ramble and lose the thread |
| `emotional_defensive` | I get emotional or defensive |
| `harsh_aggressive` | I sound too harsh or aggressive |
| `cave_under_pushback` | I cave as soon as they push back |
| `avoid_entirely` | I avoid the conversation entirely |

Pattern selection is single-select.

### B.4 Urgency

| Stable ID | Exact label |
|---|---|
| `today` | Today |
| `this_week` | This week |
| `next_2_weeks` | In the next 2 weeks |
| `no_specific_deadline` | No specific deadline |

Urgency selection is single-select.

---

## C. Three-phase wizard

### C.1 Phase 1 — “Pick your moments”

Show the exact topic catalog in §B.1. The visitor selects 1–3 topics. Selection order is retained because Phase 3 uses the first selected topic. Selecting `something_else` may reveal one bounded custom-text field. No other phase or choice requires custom input.

Continue is enabled only when topic cardinality is 1–3 and any selected `something_else` custom text passes deterministic bounds.

### C.2 Phase 2 — “Narrow the context”

Phase 2 contains exactly three questions:

1. **“Who are these conversations with?”** ordered multi-select from §B.2.
2. **“What trips you up most?”** single-select from §B.3.
3. **“When is this happening?”** single-select from §B.4.

The primary CTA is exactly **Diagnose**. Diagnose performs deterministic template projection only. It does not call an LLM, infer System 1 evidence, or judge commercial value.

### C.3 Phase 3 — deterministic Living Profile verification card

Phase 3 renders, without an LLM:

- focus areas derived from the selected topics/audiences/urgency by governed deterministic mappings;
- a selected-pattern template keyed only by the chosen pattern stable ID;
- the initial Forge target composed from the **first selected topic + first selected audience**.

The card verifies member declarations; it is not a clinical diagnosis, System 1 inference, score, or transformation claim.

Actions:

- **Adjust** → return to Phase 2 with topic, audience, pattern, and urgency selections prefilled; Phase 1 topics remain editable through normal back navigation.
- **Looks right** → guests enter the auth gate; authenticated members activate immediately.

Phase 3 is the one pre-auth verification. There is no duplicate post-auth confirmation.

---

## D. State model

| State | Meaning | Auth required | Persistence |
|---|---|---|---|
| `VISITOR` | No wizard session | No | None |
| `PICK_MOMENTS` | Phase 1 topic selection | No | Signed cookie + guest draft |
| `NARROW_CONTEXT` | Phase 2 audience/pattern/urgency | No | Signed cookie + guest draft |
| `VERIFY_PROFILE` | Phase 3 deterministic verification card | No | Signed cookie + guest draft |
| `AUTH_REQUIRED` | Guest selected Looks right | No→Yes | Guest draft until TTL |
| `ACTIVATING` | Idempotent member activation | Yes | Server |
| `FORGE_READY` | Member practice profile verified and handoff committed | Yes | Living Profile + handoff |
| `FORGE_ACTIVE` | Contextual practice | Yes | Existing Forge rules |
| `EXPIRED` | Unactivated guest draft beyond TTL | No | Purge |

Transitions:

| From → To | Trigger |
|---|---|
| `VISITOR → PICK_MOMENTS` | Primary CTA / session mint |
| `PICK_MOMENTS → NARROW_CONTEXT` | Valid ordered topic selection (1–3) |
| `NARROW_CONTEXT → VERIFY_PROFILE` | Valid audiences + pattern + urgency; Diagnose |
| `VERIFY_PROFILE → NARROW_CONTEXT` | Adjust; values prefilled |
| `VERIFY_PROFILE → AUTH_REQUIRED` | Guest selects Looks right |
| `VERIFY_PROFILE → ACTIVATING` | Authenticated member selects Looks right |
| `AUTH_REQUIRED → ACTIVATING` | Successful authentication |
| `ACTIVATING → FORGE_READY` | Atomic LP activation + handoff |
| `FORGE_READY → FORGE_ACTIVE` | Authorized practice entry |
| any unactivated state → `EXPIRED` | 14-day TTL elapsed |

Authentication never grants Forge until activation succeeds.

---

## E. Living Profile contract

### E.1 Authorized field

Decision 060 authorizes one field inside the existing Living Profile:

`member_practice_profile jsonb`

This is not a parallel profile, shadow identity store, inferred System 1 profile, or client-owned blob. The Living Profile remains the SSOT.

Conceptual payload:

```json
{
  "topics": [
    {
      "id": "job_interview",
      "customText": null
    }
  ],
  "audiences": ["recruiter_hr"],
  "pattern": "ramble",
  "urgency": "this_week",
  "verifiedAt": "ISO-8601 timestamp",
  "updatedAt": "ISO-8601 timestamp",
  "provenance": {
    "kind": "member_declared",
    "source": "coach_card_wizard",
    "sourceSessionId": "server-owned reference"
  }
}
```

Required semantics:

- `topics`: ordered array, 1–3 entries, stable IDs from §B.1; bounded `customText` allowed only for `something_else`;
- `audiences`: ordered multi-select stable IDs from §B.2;
- `pattern`: one stable ID from §B.3;
- `urgency`: one stable ID from §B.4;
- `verifiedAt`: timestamp when the member selects Looks right and activation commits;
- `updatedAt`: timestamp of the latest authorized member update;
- `provenance`: member-declared provenance, including wizard source and server-owned source-session reference.

Database/API serialization may use snake_case column keys while the application model uses camelCase, but one canonical mapping must be documented and tested. The field itself is `member_practice_profile`.

### E.2 Ownership law

LP-LAW-001 and OWN-001 remain binding:

- selections are member declarations, not System 1 inference;
- the wizard cannot invent purpose, principles, season, personality, evidence, or insight;
- anonymous draft values are provisional and cannot authorize Forge or serve as durable member identity;
- activation uses the authorized member-declared LP write path;
- member edits replace only this declared practice-profile projection and preserve unrelated richer LP values;
- Forge reads this field/handoff and never writes identity.

---

## F. Guest draft and security

Guest selections live only in provisional server-side draft storage bound to the signed HttpOnly anonymous session. Minimum draft state:

| Field | Meaning |
|---|---|
| `session_id` / `anon_key_hash` | Signed-cookie server binding |
| `phase` | Pick, narrow, verify, auth required, activated, expired |
| `topics` | Ordered 1–3 stable IDs + optional bounded Something else text |
| `audiences` | Ordered audience IDs |
| `pattern` | One pattern ID |
| `urgency` | One urgency ID |
| `expires_at` | Created + 14 days while unactivated |
| `user_id` / `activated_at` | Null until member activation |
| `version` | Concurrency/idempotency |

Security:

- HttpOnly, Secure, SameSite-compatible signed/opaque cookie;
- server row is authoritative; no direct anonymous database writes;
- origin/CSRF checks and rate limits on mutations;
- analytics exclude custom text and LP content;
- no Supabase anonymous auth user, `guest_*` profile, cloud guest reassignment, guest revival, or archive recovery;
- expired unactivated drafts are purged.

---

## G. Authentication and activation

After **Looks right**:

- authenticated member → activate immediately;
- guest → signup/login; preserve the signed draft through auth/retry; activate only after successful authentication.

Existing authentication/verification security remains authoritative. Decision 060 does not create the Decision 059 soft-verification exception.

The server activation transaction:

1. validates signed cookie, unexpired draft, catalogs, cardinality, and Phase 3 verification state;
2. locks the unactivated draft;
3. rejects ownership by another member and returns idempotent success for the same member;
4. calls `ensurePersistedLivingProfile`;
5. writes `member_practice_profile` through the authorized member-declared LP mutation path with member provenance and `verifiedAt` / `updatedAt`;
6. constructs the read-only initial Forge target from first topic + first audience;
7. marks the draft activated and rotates/clears anonymous binding;
8. returns the contextual authenticated Forge destination.

No `/coach/confirm`, repeated onboarding intake, desired-outcome question, or resumed Coach thread occurs after authentication.

---

## H. Deterministic projection contract

Phase 3 output must be a pure governed projection:

```text
focusAreas = focusAreaMap(topics, audiences, urgency)
patternTemplate = patternTemplateMap[pattern]
initialForgeTarget = forgeTargetMap[first(topics), first(audiences)]
```

Requirements:

- same ordered inputs + mapping version produce the same verification card;
- unknown IDs fail closed;
- no model call, free-form generation, inference, scoring, or semantic readiness/value evaluation;
- selected labels remain visible so the member can detect mistakes;
- mapping version is testable and changes are reviewable;
- initial Forge target never silently substitutes a later topic/audience.

---

## I. Failure and recovery

| Failure | Required behavior |
|---|---|
| Refresh/reopen within 14 days | Resume phase and exact ordered selections |
| Invalid/tampered cookie | Start clean; disclose no session existence |
| Invalid catalog/cardinality | Reject deterministically; do not advance |
| Adjust | Return to Phase 2 prefilled |
| Network failure | Retry idempotently; never advance falsely |
| Signup failure/existing email | Preserve draft; retry or login |
| Auth succeeds, response lost | Same-member activation retry returns committed Forge destination |
| Draft expires before activation | Restart; no email/archive recovery |
| Cross-member activation | Reject without disclosing details |
| LP write fails | Do not authorize Forge; preserve safe retry |
| Practice readiness/entitlement fails | Use existing authenticated remediation; never bypass |

---

## J. Analytics

Allowed funnel:

`wizard_started → moments_selected → context_narrowed → diagnose_clicked → profile_verified → auth_started → authenticated → practice_profile_activated → forge_started`

Allowed properties: stable option IDs, selection counts, `something_else` boolean, phase, mapping version, non-PII source/retry reason.

Never send bounded custom text, email, LP content, transcript, evidence, or inferred identity. There is no semantic-value, intervention, anonymous-turn, post-auth-confirmation, or Coach-resume event.

---

## K. Acceptance contract

1. Phase 1 is exactly “Pick your moments,” exact topic catalog, ordered multi-select 1–3.
2. Only Something else may reveal bounded custom text.
3. Phase 2 is exactly “Narrow the context”: audience multi-select, pattern single-select, urgency single-select, exact catalogs, CTA Diagnose.
4. Phase 3 deterministically shows focus areas, selected-pattern template, and initial Forge target from first topic + first audience.
5. Adjust returns to Phase 2 prefilled.
6. Looks right gates guests on authentication and activates authenticated members.
7. `member_practice_profile` is one JSONB field inside Living Profile with topics/audiences/pattern/urgency, verified/update timestamps, and member provenance.
8. Selections are member declarations, not System 1 inference.
9. No desired-outcome question, LLM, semantic gate, anonymous Coach turns, or duplicate post-auth confirmation exists.
10. Forge/practice APIs require authentication, successful activation, persisted LP readiness, and entitlement.
11. Signed anonymous session, 14-day TTL, no guest revival, and Assessment retention/demotion remain.
12. `guest-migration:check`, practice-readiness, auth, database deployment, and governance checks remain green.

---

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-08-16 | Decision 059 conversational discovery/value-gate architecture |
| 2.0.0 | 2026-09-07 | Decision 060 governance pivot |
| 2.1.0 | 2026-09-07 | Corrected to approved Pick moments → Narrow context → deterministic LP verification contract; authorized `member_practice_profile` |
