-- Phase 4B.1 — Persist System 1 evidence ledger + profile insights (Decision 059 / OD-9).
-- Backward-safe: existing living_profiles rows receive empty arrays via NOT NULL DEFAULT.
-- System 1 remains the only writer/authority for these columns (OWN-001).
-- Do not treat this JSONB as a second intelligence path — validation/derivation stay in
-- lib/system1/profile-evidence.ts and lib/system1/profile-intelligence.ts.

alter table public.living_profiles
  add column if not exists evidence_ledger jsonb not null default '[]'::jsonb;

alter table public.living_profiles
  add column if not exists profile_insights jsonb not null default '[]'::jsonb;

comment on column public.living_profiles.evidence_ledger is
  'System 1 observable evidence ledger (JSONB). Not identity. Written only via System 1 helpers. OD-9: if querying/auditing requires normalization later, dual-write/backfill into profile_evidence rows while keeping System 1 as the sole mutation API; then deprecate this column.';

comment on column public.living_profiles.profile_insights is
  'System 1 derived profile insights (JSONB). Must never re-enter evidence_ledger. Written only via System 1 helpers. OD-9: migrate to normalized profile_insight_rows with the same dual-write → backfill → flip-read path when needed.';
