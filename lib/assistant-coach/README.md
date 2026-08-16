# Assistant Coach — session persistence (Phase 4B.2+)

| Slice | Status |
|---|---|
| **4B.2** | Session / messages / profile_drafts schema + in-memory repository |
| 4B.3+ | Cookie mint, HTTP turn API, UI — **not in this package yet** |

## 4B.2 rules

1. Tables are **service_role / server-only** (RLS on; no anon/authenticated policies).
2. Anonymous TTL default is **14 days** (`ASSISTANT_COACH_ANON_TTL_DAYS`).
3. Draft profiles live in `assistant_coach_profile_drafts`, **not** `living_profiles`, until claim.
4. Do not resurrect `guest_*` cloud identity.
5. System 1 remains the intelligence writer for evidence/insights inside draft JSON.
