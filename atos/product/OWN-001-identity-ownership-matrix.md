# OWN-001 — Identity & Evidence Ownership Matrix

| Field | Value |
|---|---|
| **Document ID** | OWN-001 |
| **Version** | 1.0.0 |
| **Status** | Authoritative for remediation (AUDIT-001 C4 / H3) |
| **Date** | 2026-08-02 |
| **Binding** | POM-001 · LP-LAW-001 · PCM-001 · Forge Laws #014–#016 |

---

## Single source of truth

| Concern | Owner | Writers | Readers |
|---|---|---|---|
| **Who the member is becoming** (identity, purpose, principles, seasons, lifecycle) | **Living Profile** (`lib/system1`, `living_profiles`) | Member declaration · Intelligence Engine with provenance + confirmation | Dashboard, Coach, Home, Timeline, Progress (view only) |
| **Observed communication evidence** | **PCM-001** / Understanding evidence | Session observation → evidence proposals | Intelligence Engine · Readiness |
| **Relationship continuity (non-identity)** | CoachMemory (transitional Reality layer) | Session completion: last session, scenario history, counts only | Coach prompts |
| **Performance analytics** | ProgressSummary / GrowthSummary / Activity Dashboard | Session aggregates | Activity / Progress UI — **not Home** |
| **What to practice next** | Readiness → Recommendation (`lib/system2`) | Readiness Engine (from LP + evidence) | Adaptive Homepage · Coaching entry |

---

## Illegal write paths (must remain closed)

| Path | Status |
|---|---|
| Session report → CoachMemory identity fields (strength, habits, confidence, goals, wins-as-identity) | **Closed** — `applyReportToMemory` continuity-only |
| Session report → Living Profile identity fields without provenance | **Closed** — proposals only (`proposeIdentityEvidenceFromReport`, `memberConfirmed: false`) |
| MissionPicker / Dashboard → identity or readiness ownership | **Closed** — MissionPicker quarantined; Dashboard demoted to Activity |
| Experience UI inventing purpose / principles | **Forbidden** — Forge Law #015 |

---

## CoachMemory quarantine rules

`CoachMemory` may keep:

- `displayName` / nickname when member-provided
- `lastSession*`, `sessionsCompleted`, `favoriteScenarios`, `pastExercises`
- Member-edited fields from Settings (declared)

`CoachMemory` must **not** auto-update from sessions:

- `biggestStrength`, `speakingHabits`, `confidenceLevel`
- `topicsWorkingOn`, `recentWins` (identity-adjacent)

Migrate declared identity onto Living Profile; do not grow a third store.

---

## Dependency chain (enforced)

```
Living Profile → Readiness → Adaptive Homepage → Coaching
```

No feature may assume Coaching or mission choice before Profile + Readiness gates.

---

## Open PR freeze

See [FREEZE-001](FREEZE-001-identity-pr-hold.md). Do not merge colliding identity PRs until this matrix + AUDIT-001.1 hold.
