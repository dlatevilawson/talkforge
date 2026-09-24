# READINESS-MEASUREMENT-001 — Readiness Measurement Contract v1

| Field | Value |
|---|---|
| **Document ID** | READINESS-MEASUREMENT-001 |
| **Version** | 1.0.0 |
| **Status** | Founder authorized — foundation only |
| **Owner** | Founder |
| **Updated** | 2026-09-23 |
| **Decision** | 063 |
| **Related** | IV-FEAT-001 · BS-003 · BS-004 · BS-014 |

## Boundary

This contract governs what a TalkForge session evaluation may claim and how its
evidence is stored. It does not authorize a member UI, an LLM evaluation prompt,
training programs, pricing changes, or voice-pipeline changes.

Readiness is demonstrated behavior during practice. It is never personality,
worth, a 0–100 score, a comparison with another member, or a promise of a
real-world outcome.

## Signals

Every assessment uses exactly five signals:

1. **Purpose** — anchoring to the conversation's goal.
2. **Perspective** — accounting for the listener's world.
3. **Composure** — regulation under observable friction.
4. **Message** — clarity and structure of the takeaway.
5. **Adaptability** — tactical adjustment after a shift.

The internal evidence levels are 0–4. Member-facing labels are:

| Internal level | Member label |
|---|---|
| 0 | Needs rebuilding |
| 1 | Early practice |
| 2 | Developing |
| 3 | Demonstrated |
| 4 | Sustained in practice |
| null | Not measured in this session |

Null and zero are different facts. Null always carries a reason code. A level
always requires session evidence.

## Evidence contract

- Evidence comes from the current session only.
- Each signal stores `sufficient`, `limited`, or `insufficient` evidence.
- Only `sufficient` evidence participates in an overall band or a trend.
- `limited` evidence may be shown as provisional but cannot lift or lower a band.
- `insufficient` evidence produces a null level and one of the bounded reason
  codes defined in the schema.
- A signal may have multiple evidence references: support, friction, recovery,
  or breakdown, each linked to a turn or timestamp when available.
- Composure defaults to null when the session contains no friction event.
- Adaptability defaults to null when the session contains no shift, objection,
  or new information.

## Overall band derivation

Focused drills, text exercises, priming rituals, and field log-backs never
receive an overall band. Diagnostic, check-in, emergency, and substantive free
practice sessions are eligible only when at least four signals have sufficient
evidence.

Evaluate the following rules top to bottom; first match wins:

1. Any signal at level 0, or two or more at level 1 → **Building Baseline**.
2. Exactly one signal at level 1 and none at level 0 → **One Focus Area**.
3. Minimum observed level 3 and at least two signals at level 4 →
   **Sustained in Practice**.
4. Minimum observed level 2 and at least two signals at level 3 or higher →
   **Solid Ground**.
5. Otherwise → **Early Reps**.

“Sustained in Practice” means the signal held through the hardest pressure this
practice introduced. It does not mean the member is guaranteed ready for the
real event.

## Comparability

Computed movement requires the same scenario family, modality, session purpose,
pressure level, compatible rubric major version, and the same signal with
sufficient evidence.

- Two comparable sessions permit a direct comparison.
- Three or more comparable sessions permit a trend.
- Cross-family history may be listed with context labels, but no computed delta.
- Different rubric major versions remain historical and are not auto-compared.

## Storage and privacy

- Assessments are immutable revisions; a later baseline refinement creates a
  new row and never rewrites the original.
- Assessment, signal, and evidence rows belong to the session owner.
- During Decision 064 shadow validation, assessment, signal, evidence, and run
  rows are service-role-only. A later member-display decision must explicitly
  restore authenticated read grants and owner policies.
- Account deletion cascades through `practice_sessions`; the six-column reset
  return contract does not change.
- No readiness assessment writes Living Profile identity.

## Ship gates after this foundation

Before any member-facing evaluation ships:

1. **Complete:** the Founder authorized the 25-cell behavioral anchors in
   [READINESS-ANCHORS-001](READINESS-ANCHORS-001.md) under Decision 064.
2. **Complete:** Decision 065 authorized the thresholds and fail paths in
   [READINESS-SHADOW-VALIDATION-001](READINESS-SHADOW-VALIDATION-001.md).
3. Validate structured model output against the contract on consented test data.
4. Confirm human reviewers can reproduce levels and evidence references.
5. Confirm no visible 0–100 score, cross-member comparison, or outcome guarantee.
6. Receive a separate Founder approval before any evaluation prompt output or UI
   slice becomes member-facing. Decision 064 authorizes shadow evaluation only.

## Decision 064 shadow operation

The shadow evaluator is inert unless all of the following are true:

1. The foundation and shadow-audit migrations are explicitly applied and
   reconciled separately.
2. `READINESS_SHADOW_ENABLED=true` is set in the server environment.
3. `READINESS_SHADOW_ALLOWED_USER_IDS` contains the exact authenticated UUID of
   each member who consented to the validation cohort.
4. `OPENAI_READINESS_MODEL` names the deliberately selected evaluation model.
5. `OPENAI_API_KEY` and `SUPABASE_SERVICE_ROLE_KEY` remain server-only.

The endpoint returns only a generic accepted receipt. Assessment status, model
errors, levels, bands, evidence, and eligibility are never returned to the
member. Removing a member UUID from the allowlist stops new shadow evaluations;
it does not rewrite immutable prior assessments.

Before each model request, the server reserves one private audit row for the
session, rubric version, and revision. The row records only the selected/actual
model, outcome, provider-reported input/output tokens, sanitized error code,
and resulting assessment ID. It never stores prompts or raw model output.
