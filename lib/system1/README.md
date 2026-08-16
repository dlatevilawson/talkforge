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
Storage: `getLivingProfile` / `saveLivingProfile` (soft-fail if unmigrated).

`evidenceLedger` / `profileInsights` are Phase 1 TypeScript fields. Mapping
defaults missing DB columns to `[]`. A future migration may persist them as
JSON columns — not required for this foundation slice.

## Next implementation slices

1. Apply `living_profiles` migration in production (if still pending).
2. Persist evidence ledger + profile insights (DB columns).
3. Assistant Coach discovery flow writing evidence (not Forge).
4. Gradually bridge assessment-synthesis onto System 1 helpers.
5. Unify profile UI onto one surface.
6. Intelligence confirmation flow for pending provenance proposals.
