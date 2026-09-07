# PHASE4B-AC-IMPLEMENTATION-SEQUENCE — Deterministic Coach wizard slices

| Field | Value |
|---|---|
| **Document ID** | PHASE4B-AC-001 |
| **Status** | Authoritative sequence under Decision 060 |
| **Authority** | [Decision 060](../../atlas/decisions.md) · [AC-JOURNEY-001](AC-JOURNEY-001-first-user-architecture.md) · [IV-PROD-009](../knowledge/working/idea-vault/product-ideas/IV-PROD-009-first-user-assistant-coach-journey.md) · [IV-UX-011](../knowledge/working/idea-vault/ux-ideas/IV-UX-011-deterministic-coach-card-wizard.md) |
| **Blind spot** | [BS-018](../knowledge/working/blind-spot-register/bs-018.md) |
| **Law** | One reviewable slice per PR. No discovery LLM, desired-outcome question, semantic gate, duplicate post-auth confirmation, or `guest_*` revival. |
| **Created** | 2026-08-16 |
| **Updated** | 2026-09-07 |

---

## Active vertical slice

Decision 059 remains historical track authorization. Decision 060 controls:

**Pick your moments → Narrow the context → deterministic Living Profile verification → Looks right → auth for guests → `member_practice_profile` activation → contextual Forge.**

Retain signed HttpOnly anonymous-session continuity and 14-day TTL only for provisional guest drafts/auth retry. Authentication and activation are required before Forge. Assessment remains available but is demoted from default FTUE.

---

## Binding contract

| Area | Contract |
|---|---|
| Phase 1 | “Pick your moments”; exact topic catalog; ordered multi-select 1–3 |
| Custom text | Only Something else may reveal bounded custom text |
| Phase 2 Q1 | Audiences exact catalog; ordered multi-select |
| Phase 2 Q2 | Pattern exact catalog; single-select |
| Phase 2 Q3 | Urgency exact catalog; single-select |
| Phase 2 CTA | **Diagnose** |
| Phase 3 | Deterministic LP verification: focus areas + selected-pattern template + Forge target from first topic + first audience |
| Phase 3 actions | **Adjust** → Phase 2 prefilled; **Looks right** → auth gate for guests / activation for members |
| LP storage | One `member_practice_profile` JSONB field inside Living Profile |
| Ownership | Picks are member declarations with member provenance, not System 1 inference |
| Auth | Required before guest activation and before every Forge/practice route/API |
| Explicit absence | No desired outcome, discovery LLM, semantic value, anonymous Coach turns, or post-auth confirm |

Stable IDs and exact labels are defined in AC-JOURNEY-001 §B and must be shared by UI, API validation, persistence, deterministic projection, analytics, and tests.

---

## Prerequisite

| ID | Deliverable | Done when |
|---|---|---|
| **4B.G** | Decision 060, IV-UX-011, BS-018, IV-PROD-009, AC-JOURNEY-001, sequence/index updates | Governance-only change reviewed |

---

## Exact implementation sequence

### Slice 4B.W1 — Retire superseded active-path behavior

**Goal:** Establish one first-user contract.

| Item | Spec |
|---|---|
| Inventory | Locate reachable conversational discovery, public/anonymous Coach turns, semantic value/intervention/turn-cap, claim-confirm, desired-outcome, and soft-verify branches |
| Retirement | Remove or make unreachable from FTUE; retain only reusable signed session/TTL substrate |
| Route contract | Define deterministic wizard read/write/activation routes and authenticated Forge boundary |
| Tests | First-user route performs no LLM call and accepts no anonymous Coach turn |
| Non-goals | Broad Assistant Coach library deletion, Forge brain changes, frozen HARDEN edits |

Do not leave competing FTUEs.

---

### Slice 4B.W2 — Living Profile `member_practice_profile`

**Goal:** Add the one Founder-authorized member-declared JSONB field inside Living Profile.

| Item | Spec |
|---|---|
| Migration | Add `living_profiles.member_practice_profile jsonb` through a new ordered migration |
| Manifest | Append migration to `supabase/migrations/manifest.json`; schema snapshot remains non-deployable reference |
| Shape | `topics`, `audiences`, `pattern`, `urgency`, `verified_at`, `updated_at`, member provenance |
| Validation | Exact stable-ID catalogs/cardinality; bounded Something else text only |
| Write authority | Existing authorized LP member-declared mutation path; never direct client JSONB poke |
| Read authority | Living Profile mapper/API; Forge read-only |
| Tests | DB mapper round-trip, unknown-ID rejection, provenance/timestamps, unrelated LP fields preserved |
| Non-goals | Parallel profile/table, System 1 inference, wizard UI, guest write |

The JSONB field is part of Living Profile SSOT. It is not `living_profiles_drafts`, a Coach profile, or a second identity source.

---

### Slice 4B.W3 — Provisional guest draft projection

**Goal:** Reuse the secure anonymous substrate for unverified wizard choices.

| Item | Spec |
|---|---|
| Session | Signed HttpOnly cookie + server row; 14-day unactivated TTL |
| Draft | Phase, ordered topics (1–3), optional bounded Something else text, ordered audiences, one pattern, one urgency, version |
| Separation | Draft does not write `member_practice_profile`, authorize Forge, or become member identity |
| Removal | No messages, model metadata, inferred profile, `has_experienced_value`, evidence counters, intervention, or turn cap needed |
| Security | Origin/CSRF, rate limit, server-only DB access, opaque errors |
| Tests | Mint/restore/tamper/expiry, ordered value round-trip, no `guest_*` identity |
| Non-goals | UI, auth activation, Forge |

Existing obsolete nullable conversational columns may remain temporarily if destructive cleanup needs a later lifecycle migration, but active code must not use them.

---

### Slice 4B.W4 — Catalog and deterministic projection module

**Goal:** Create one versioned source for exact labels, stable IDs, validation, and Phase 3 projection.

| Item | Spec |
|---|---|
| Topics | Exact 10 labels/IDs from AC-JOURNEY-001 §B.1 |
| Audiences | Exact 7 labels/IDs from §B.2 |
| Patterns | Exact 6 labels/IDs from §B.3 |
| Urgency | Exact 4 labels/IDs from §B.4 |
| Cardinality | Topics 1–3 ordered; audiences ordered multi; pattern one; urgency one |
| Projection | `focusAreas`, `patternTemplate`, `initialForgeTarget(firstTopic, firstAudience)` |
| Behavior | Pure/versioned; unknown IDs fail closed; no LLM/inference/scoring |
| Tests | Exact snapshots of IDs/labels, all cardinality edges, same input same output, first-selected ordering |
| Non-goals | React UI, final visual polish |

---

### Slice 4B.W5 — Phase API and restore

**Goal:** Persist deterministic progress safely.

| Item | Spec |
|---|---|
| Read | Return current phase, catalog version, ordered draft selections, deterministic verification when complete |
| Phase 1 write | 1–3 topic IDs + bounded custom text only when Something else selected |
| Phase 2 write | Audience IDs + one pattern + one urgency |
| Diagnose | Validate and transition to deterministic Phase 3; no model call |
| Adjust | Transition to Phase 2 without clearing values |
| Idempotency | Client request ID + optimistic version |
| Tests | Ordering, invalid ID/cardinality, custom-text rule, Diagnose, Adjust prefill, replay/stale version |
| Non-goals | Auth activation, LP member write |

---

### Slice 4B.W6 — Three-phase card UI

**Goal:** Deliver the complete pre-auth wizard.

| Item | Spec |
|---|---|
| Phase 1 heading | **Pick your moments** |
| Phase 1 behavior | Exact topic cards; ordered multi-select 1–3; Something else bounded text |
| Phase 2 heading | **Narrow the context** |
| Phase 2 behavior | Q1 audience multi-select; Q2 pattern single-select; Q3 urgency single-select |
| CTA | **Diagnose** |
| Phase 3 | Focus areas, selected-pattern template, initial Forge target from first topic + first audience |
| Actions | **Adjust** returns Phase 2 prefilled; **Looks right** follows member/guest boundary |
| Restore | Refresh/browser reopen restores exact ordered selections within TTL |
| Quality | Keyboard/focus/labels/reduced motion/mobile; Craft Law #001 + DES-001 |
| Tests | Exact copy/catalog, 1–3 cap, selection modes, Something else, Diagnose, deterministic card, Adjust, restore |
| Non-goals | Universal custom-input requirement, chat shell, post-auth confirm |

---

### Slice 4B.W7 — Authentication return and member activation

**Goal:** Make Looks right the single verification-to-ownership transition.

| Item | Spec |
|---|---|
| Existing member | Looks right → activate immediately |
| Guest | Looks right → signup/login; preserve signed draft/return intent |
| Verification | Existing auth security remains; no soft-verify Coach exception |
| Transaction | Validate draft/catalog/version → lock → same-user idempotency → `ensurePersistedLivingProfile` → authorized LP write → handoff → mark activated |
| LP write | `member_practice_profile` topics/audiences/pattern/urgency + `verified_at`/`updated_at` + member provenance |
| Handoff | Initial Forge target uses first topic + first audience; read-only |
| Destination | Direct contextual `/app/practice`; no `/coach/confirm` or repeated onboarding |
| Gate | Auth + persisted LP readiness + entitlement + existing practice protections |
| Tests | Guest/member paths, auth retry, idempotency, cross-user rejection, rollback, purpose/unrelated LP untouched, unauth Forge denied |
| Non-goals | Site-wide auth redesign, direct browser LP write, Forge brain/VAD changes |

---

### Slice 4B.W8 — Landing priority and Assessment demotion

**Goal:** Make wizard the single default FTUE while preserving Assessment.

| Item | Spec |
|---|---|
| Landing | Primary CTA enters/resumes Pick your moments |
| Secondary | Sign in/membership subordinate |
| Assessment | Routes/APIs remain; not default/equal FTUE |
| Tests | CTA target, new-user routing, Assessment reachability |
| Non-goals | Assessment deletion/lifecycle rewrite |

Do not switch production CTA before W7 passes end-to-end.

---

### Slice 4B.W9 — Funnel analytics and expiry

**Goal:** Measure and enforce the deterministic path without member text.

| Item | Spec |
|---|---|
| Events | `wizard_started`, `moments_selected`, `context_narrowed`, `diagnose_clicked`, `profile_verified`, `auth_started`, `authenticated`, `practice_profile_activated`, `forge_started` |
| Allowed | Stable IDs, counts, Something else boolean, mapping version, phase, non-PII retry/source |
| Ban | Custom text, email, LP content, transcript, evidence, inferred identity |
| Purge | Expire/purge unactivated drafts at 14 days |
| Tests | Event allowlist/no-text; clock/expiry/cascade |
| Non-goals | Value/intervention/turn/resume analytics, archive recovery |

---

## Dependency DAG

```text
4B.G governance
  → W1 retire superseded path
  → W2 member_practice_profile
  → W3 provisional guest draft
  → W4 exact catalog + deterministic projection
  → W5 phase API/restore
  → W6 card UI
  → W7 auth return + activation + Forge
  → W8 landing + Assessment demotion
  → W9 analytics + expiry
```

W2 and W3 may be implemented independently after W1 if their migrations remain ordered. W8 must not activate the landing CTA before W7 verification.

---

## Prior Decision 059 slice disposition

| Prior area | Decision 060 disposition |
|---|---|
| LP evidence/insights JSONB | Still governed by System 1; not wizard storage |
| Anonymous session/cookie/TTL | Reuse for provisional draft |
| Anonymous turn API/public chat | Remove from FTUE |
| Semantic value/intervention/turn cap | Superseded |
| Hard value gate | Replace with Looks right → auth/activation |
| Claim + inferred-profile merge | Replace with `member_practice_profile` member-declared activation |
| Soft verify Coach continuity | Superseded; existing auth applies |
| Post-claim confirmation | Remove; Phase 3 is verification |
| Landing AC CTA | Retarget to Pick your moments |
| Assessment demotion | Retain |
| Forge handoff | Retain after authenticated activation, first topic + first audience |

“Superseded” does not authorize destructive data removal without migration/lifecycle review.

---

## Security and ownership checklist

- [ ] Exact shared stable IDs/labels and selection modes.
- [ ] Cookie remains HttpOnly, Secure, SameSite-compatible, signed/opaque, server-validated.
- [ ] Guest drafts expire after 14 days.
- [ ] No Supabase anonymous auth user, `guest_*` profile, cloud reassignment, revival, or archive recovery.
- [ ] Guests cannot write Living Profile, enter Forge, or mint practice/realtime tokens.
- [ ] `member_practice_profile` is inside Living Profile and written only through authorized member-declared mutation.
- [ ] Member provenance and verified/update timestamps persist.
- [ ] No purpose, identity, evidence, or insight inference.
- [ ] Adjust preserves Phase 2 values; Looks right is the sole verification transition.
- [ ] Forge gets read-only context from first topic + first audience.
- [ ] No custom text enters analytics.
- [ ] `guest-migration:check`, practice-readiness, auth, DB deployment, and governance checks remain green.

---

## Explicit non-goals

- Canonical admission of Working Knowledge.
- Desired-outcome field/question.
- Conversational discovery or prompt refinement.
- LLM-generated diagnosis.
- Pre-account coaching value or anonymous Forge.
- Semantic value/intervention/turn-count conversion.
- Universal custom-input requirement.
- Duplicate post-auth confirmation.
- Parallel practice profile or direct client JSONB write.
- Assessment deletion.
- Forge Core, VoiceArena VAD, billing, Progress, or unrelated feature changes.
- Frozen HARDEN-001 through HARDEN-005 changes.
- One mega-PR implementing W1–W9.

---

## Change log

| Version | Date | Change |
|---|---|---|
| 1.0.0 | 2026-08-16 | Decision 059 conversational discovery/value-gate sequence |
| 2.0.0 | 2026-09-07 | Decision 060 governance pivot |
| 2.1.0 | 2026-09-07 | Corrected exact moments/context/verification contract and `member_practice_profile` sequence |
