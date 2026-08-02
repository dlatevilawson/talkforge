# REMEDIATE-002 — Conditional GO Implementation Report

| Field | Value |
|---|---|
| **Document ID** | REMEDIATE-002 |
| **Version** | 1.0.0 |
| **Date** | 2026-08-02 |
| **Branch** | `cursor/conditional-go-remediation-98b4` |
| **Prior** | [REMEDIATE-001](REMEDIATE-001-architecture-remediation.md) · [AUDIT-001.1](AUDIT-001.1-architecture-reaudit.md) |
| **Re-audit** | [AUDIT-001.2](AUDIT-001.2-conditional-go-reaudit.md) |

---

## What was implemented

1. **Production Living Profile migration** — `supabase/migrations/20260802_living_profiles.sql` (+ print script `npm run db:living-profiles`), with SQL backfill of member-declared coach_memory fields only.
2. **Profile UI unified onto Living Profile** — `/app/profile` reads/writes LP via `/api/living-profile` (GET/PUT) with member provenance.
3. **Settings stripped of identity writes** — continuity-only (learning style, emotional triggers); identity pointed to Living Profile.
4. **SSOT enforcement** — coach prompt context prefers LP for purpose/seasons/nickname/style; session confidence/habits no longer treated as identity; memory-server loads LP.
5. **System 2 readiness contracts completed** — `rankReadinessCandidates`, `narrowToObjective`, `recommendNextStep`, `evaluateReadiness` (recommend / rank / narrow); pending evidence labeled, not identity.
6. **ContinuityHome** — incomplete profile CTA → Complete Living Profile before practice; MissionPicker remains quarantined.
7. **Runtime backfill** — empty LP filled from declared coach_memory on GET (not from session-inferred fields).

---

## What was fixed

| Gap | Fix |
|---|---|
| Profile was account-only | Living Profile editor with provenance |
| Settings wrote identity into CoachMemory | Removed; LP is write path |
| Coach prompt ignored LP | `buildCoachPromptContext(..., livingProfile)` |
| Session scores → confidence identity | Removed |
| Readiness stub lacked rank/narrow | Full contract surface |
| No applyable LP migration file | `20260802_living_profiles.sql` |

---

## What remains blocked

- **Ops:** Applying `20260802_living_profiles.sql` in production Supabase (code soft-fails until then).
- **FREEZE-001:** Held identity PRs still must not merge until AUDIT-001.2 accepted and freeze lifted.
- **Intelligence confirmation UX** for pending evidence (proposals visible; confirm flow not a feature sprint).
- **MatteringConversation persistence** (SYS1 next slice — not required to close Conditional GO identity SSOT).

---

## What was intentionally not changed

- No new product surfaces or mission menus
- No MissionPicker restoration
- No schema expansion beyond `living_profiles` already required
- No new philosophical layers
- CE voice substrate left alone except identity-safe prompt context
- Dashboard remains Activity-only

---

## Files / systems touched

`supabase/migrations/20260802_living_profiles.sql`, `scripts/apply-living-profiles-migration.mjs`, `app/api/living-profile`, `app/app/profile`, `app/app/settings`, `ContinuityHome`, `lib/system1/*`, `lib/system2/*`, `lib/coach/memory.ts`, `lib/coach/memory-server.ts`, doctrine reports, AGENTS/README/decisions.

---

## Ready for re-audit?

**Yes** — AUDIT-001.2 can run against this branch. Production migrate must be applied for full persistence confidence.

---

## Next step

**Continued hardening / ops migrate**, then Founder freeze lift — **not** unconstrained feature work until AUDIT-001.2 GO for features.
