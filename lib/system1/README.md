# System 1 — Code substrate (EXEC Step 13)

Authorized by [BUILD-SYS1-001](../../atos/product/BUILD-SYS1-001.md).

| Module | Role |
|---|---|
| `types.ts` | Living Profile, Provenance, Conversation lifecycle, write guards |
| `index.ts` | Public exports |

## Rules (do not violate)

1. Experiences never write Living Profile identity fields.
2. Intelligence writes require provenance + confirmation rules (`canWriteLivingProfileField`).
3. Purpose / Personal Principles are member-declared only.
4. Migrate `CoachMemory` / split UIs onto `LivingProfile` — do not add a third identity store.

## Next implementation slices

1. Persist `LivingProfile` + `ProvenanceRecord` (Supabase).
2. Persist `MatteringConversation` lifecycle.
3. Unify profile UI onto one surface.
4. Feed Understanding layer from sessions → provenance proposals (not direct writes).
