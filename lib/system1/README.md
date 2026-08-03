# System 1 — Code substrate (EXEC Step 13)

Authorized by [BUILD-SYS1-001](../../atos/product/BUILD-SYS1-001.md).

| Module | Role |
|---|---|
| `types.ts` | Living Profile, Provenance, Conversation lifecycle, write guards |
| `proposals.ts` | Session → evidence proposals (never direct identity commits) |
| `profile.ts` | Empty profile + attach pending proposals |
| `index.ts` | Public exports |

## Rules (do not violate)

1. Experiences never write Living Profile identity fields.
2. Intelligence writes require provenance + confirmation rules (`canWriteLivingProfileField`).
3. Purpose / Personal Principles are member-declared only.
4. Migrate `CoachMemory` / split UIs onto `LivingProfile` — do not add a third identity store.
5. Ownership: [OWN-001](../../atos/product/OWN-001-identity-ownership-matrix.md).

## Persistence

Table `living_profiles` is deployed through the ordered path in
`supabase/migrations/manifest.json`. `supabase/schema.sql` is review-only.
Storage: `getLivingProfile` / `saveLivingProfile` (soft-fail if unmigrated).

## Next implementation slices

1. Apply `living_profiles` migration in production.
2. Persist `MatteringConversation` lifecycle.
3. Unify profile UI onto one surface.
4. Intelligence confirmation flow for pending provenance proposals.
