# REMEDIATE-001 — Architecture Remediation Report

| Field | Value |
|---|---|
| **Document ID** | REMEDIATE-001 |
| **Version** | 1.0.0 |
| **Date** | 2026-08-02 |
| **Branch** | `cursor/exec-foundation-strategy-98b4` |
| **Responds to** | AUDIT-001 Critical Issues C1–C5 |
| **Re-audit** | [AUDIT-001.1](AUDIT-001.1-architecture-reaudit.md) |

---

## 1. Critical issues found (from AUDIT-001)

| ID | Issue |
|---|---|
| **C1** | SYS1 / SYS2 / POM / LP-LAW / S2-LAW absent from shipping tree |
| **C2** | Forge Laws #014–#017 missing / historically conflicted |
| **C3** | MissionPicker + dashboard home bypass Profile → Readiness → Homepage |
| **C4** | CoachMemory / experiences write identity-adjacent fields without provenance |
| **C5** | Open identity PRs collide with Living Profile SSOT |

---

## 2. Fixes applied

| ID | Fix |
|---|---|
| **C1** | Restored `SYS1-001`, `SYS2-001`, `POM-001`, `LP-LAW-001`, `S2-LAW-001/002` into product doctrine; wired README / AGENTS |
| **C2** | Published Forge Laws #014–#017 in `atlas/forge-laws.md` (Evidence, Purpose Autonomy, One-way flow, Continuity); product decision filter updated |
| **C3** | `/app` is ContinuityHome (Adaptive Homepage stub); MissionPicker quarantined (no mission tiles); Dashboard demoted to Activity; AppShell Home → `/app` |
| **C4** | `applyReportToMemory` continuity-only; `proposeIdentityEvidenceFromReport` + Living Profile provenance proposals; `living_profiles` table + storage; OWN-001 matrix |
| **C5** | FREEZE-001 holds living-coach-profile / purpose-alignment / pom-founding until SSOT settled |
| **Build order** | `lib/system2` Readiness + AdaptiveHome contracts; Homepage calls `buildAdaptiveHome` |

---

## 3. Files or systems changed

**Doctrine:** `atlas/forge-laws.md`, `atos/product/SYS1-001*`, `SYS2-001*`, `POM-001*`, `LP-LAW-001*`, `S2-LAW-001/002*`, `OWN-001*`, `FREEZE-001*`, `AUDIT-001.1*`, `REMEDIATE-001*`, product README, AGENTS, EXEC, decisions.

**Code:** `lib/coach/memory.ts`, `lib/session.ts`, `lib/storage.ts`, `lib/system1/*`, `lib/system2/*`, `app/app/page.tsx`, `ContinuityHome`, `MissionPicker`, `training/page`, `dashboard/page`, `AppShell`, `app/api/living-profile`, `supabase/schema.sql`.

---

## 4. What remains blocked

- Full Readiness / Recommendation / Pedagogy engines (contracts only — intentional)
- Migration of Settings / Profile UI onto Living Profile fields
- Applying held identity PRs (until FREEZE-001 lifted)
- Production `living_profiles` migration must be applied in Supabase for persistence to stick (code soft-fails if absent)
- H1 reflection-before-score still open (High, not Critical)

---

## 5. Re-audit recommendation

Accept AUDIT-001.1. Re-score after production migration of `living_profiles` if GO needs “persisted SSOT in prod,” not only schema-in-repo.

---

## 6. Go / No-Go verdict for feature development

See AUDIT-001.1.

**Summary:** Critical architecture contradictions closed on this branch. **NO-GO** for unconstrained new features. **CONDITIONAL GO** only for Living Profile persistence/UI unify and System 2 engine implementation that consume OWN-001 / SYS contracts — not for mission menus, identity schema from held PRs, or experience→identity writes.
