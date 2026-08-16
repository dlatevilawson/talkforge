# System 1 — Code substrate (EXEC Step 13)

Authorized by [BUILD-SYS1-001](../../atos/product/BUILD-SYS1-001.md).

| Module | Role |
|---|---|
| `types.ts` | Living Profile, Provenance, Conversation lifecycle, write guards |
| `profile-evidence.ts` | Reusable evidence ledger (not identity; no synthesized claims) |
| `profile-intelligence.ts` | Derived insights + compact `buildCoachContext` for Forge |
| `proposals.ts` | Session → evidence proposals (never direct identity commits) |
| `profile.ts` | Empty profile + attach pending proposals |
| `index.ts` | Public exports |

## Rules (do not violate)

1. Experiences never write Living Profile identity fields.
2. Intelligence writes require provenance + confirmation rules (`canWriteLivingProfileField`).
3. Purpose / Personal Principles are member-declared only.
4. Evidence is not identity. Interaction signals may be stored; they never become facts.
5. Synthesized / derived insights never re-enter the evidence ledger.
6. Migrate `CoachMemory` / split UIs onto `LivingProfile` — do not add a third identity store.
7. Ownership: [OWN-001](../../atos/product/OWN-001-identity-ownership-matrix.md).

## Persistence

Table `living_profiles` is deployed through the ordered path in
`supabase/migrations/manifest.json`. `supabase/schema.sql` is review-only.

| Column | Role |
|---|---|
| `evidence_ledger` (jsonb, default `[]`) | System 1 observable evidence — **not** identity |
| `profile_insights` (jsonb, default `[]`) | System 1 derived insights — never re-enter evidence |

**Writers:** System 1 helpers only (`system1IntelligenceDbPayload` /
`saveLivingProfileSystem1Intelligence`). Member PUT uses
`memberLivingProfileDbPayload`, which **omits** these columns so updates cannot
overwrite intelligence. Assessment routes must not write them either.

**OD-9 migration path (when querying/auditing needs normalization):**

1. Add `profile_evidence` / `profile_insight_rows` tables.
2. Dual-write from System 1 writers behind a flag.
3. Backfill from JSONB.
4. Flip reads to SQL; keep System 1 as the only mutation API.
5. Deprecate JSONB columns after verification.

Mapping still defaults missing/null columns to `[]` for pre-migration soft-fail.

## Next implementation slices

1. Apply `20260816_living_profile_evidence_insights.sql` in production.
2. Assistant Coach discovery flow writing evidence via System 1 (Phase 4B.2+).
3. Gradually bridge assessment-synthesis onto System 1 helpers.
4. Unify profile UI onto one surface.
5. Intelligence confirmation flow for pending provenance proposals.
