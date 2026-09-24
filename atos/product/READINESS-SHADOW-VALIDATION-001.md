# READINESS-SHADOW-VALIDATION-001 — Shadow Evaluator Pass-Bar Contract

| Field | Value |
|---|---|
| **Document ID** | READINESS-SHADOW-VALIDATION-001 |
| **Version** | 0.1.0 |
| **Status** | Founder authorized — shadow validation pass bar only |
| **Owner** | Founder |
| **Updated** | 2026-09-24 |
| **Decision** | 065 |
| **Parents** | READINESS-MEASUREMENT-001 v1.0.0 · READINESS-ANCHORS-001 v1.0.0 |

## Purpose

This contract defines the evidence required for the private readiness shadow
evaluator to pass validation. It answers one question: **does the evaluator
apply the Founder-approved readiness contract reliably enough to justify a
later decision about member display?**

It does not authorize migration application, shadow activation, cohort
enrollment, member-facing output, a readiness UI, a training program, or a
change to the measurement or anchor contracts. A pass under this contract is
evidence for a later Founder decision. It is not that decision.

## Authority and frozen inputs

Validation uses these inputs without reinterpretation:

1. [READINESS-MEASUREMENT-001](READINESS-MEASUREMENT-001.md) v1.0.0 defines
   signals, evidence strength, null semantics, bands, comparability, privacy,
   and forbidden claims.
2. [READINESS-ANCHORS-001](READINESS-ANCHORS-001.md) v1.0.0 defines the 25
   behavioral anchor cells.
3. The evaluator prompt version, rubric version, model name, and model snapshot
   are frozen for one validation cohort.

Changing the prompt, anchors, output schema, model, or model snapshot creates a
new evaluator version. Results from different evaluator versions are never
pooled to reach a pass.

## Founder-approved thresholds

Decision 065 authorizes these validation thresholds:

- **20** eligible, consented shadow sessions in one evaluator-version cohort.
- At least **four scenario families**, including low-friction and
  moderate/high-friction sessions.
- Two independent human reviewers per session, plus adjudication where they
  disagree.
- The agreement and stability thresholds in this document.
- The zero-tolerance and fail-path rules in this document.

This authorization defines how shadow evidence is judged. It does not authorize
migration application, shadow activation, cohort enrollment, or member display.

## Validation stages

The stages run in order. A later stage cannot cure a failed earlier stage.

### Stage 0 — preflight

Before the first production shadow session:

- The Founder has approved this pass-bar contract.
- The separately authorized foundation and shadow-audit migrations have been
  applied, reconciled to the repository filename, manifest, and schema
  snapshot, and checked against the pre-apply security-advisor baseline.
- Shadow mode remains off until the exact consented member UUIDs are in the
  server-side allowlist.
- The rubric version, evaluator version, prompt hash, output-schema version,
  requested model, and actual model are recordable for every run.
- No readiness value, evidence, band, eligibility state, model error, or audit
  state is returned to or rendered for a member.
- The fixed boundary fixture suite in Stage 1 passes.

### Stage 1 — fixed boundary fixtures

Run at least ten curated fixtures before consented production sessions. The set
must include at least:

- two sessions with no friction, where Composure must be null;
- two sessions with no shift, where Adaptability must be null;
- two level-0 boundary cases with observable breakdown and a recovery
  opportunity;
- two level-4 boundary cases with meaningful pressure or a member-created test;
- two adversarial cases covering prompt injection, unsupported inference, or
  attempted cross-session evidence.

Every fixture must pass its expected applicability, null, traceability, and
forbidden-inference assertions. Fixture failure blocks Stage 2.

### Stage 2 — consented shadow cohort

Collect at least 20 eligible completed sessions from explicitly consented,
allowlisted test members. The cohort must contain:

- at least four scenario families;
- at least five low-friction sessions;
- at least five moderate/high-friction sessions;
- at least five sessions in which Composure is expected to be null;
- at least five sessions in which Adaptability is expected to be null; and
- at least 60 adjudicated non-null signal cells across the cohort;
- at least ten adjudicated non-null cells for each signal; and
- at least ten band-eligible sessions.

If a minimum is not met, the result is **insufficient coverage**, not pass or
fail. Collect more eligible sessions under the same frozen evaluator version.

## Human reference procedure

Each session is reviewed as follows:

1. Two reviewers independently inspect the current-session transcript and
   scenario metadata without seeing the model output or the other review.
2. For every signal, each reviewer records:
   - assessed or null;
   - level 0–4 when assessed;
   - `sufficient`, `limited`, or `insufficient` evidence;
   - evidence turn IDs and exact snippets;
   - the bounded null reason when null; and
   - whether the session supplied required friction, shift, or pressure.
3. Reviewers then reveal the model result and record agreement without changing
   their original labels.
4. A third reviewer adjudicates disagreements. The adjudicated result is the
   human reference used by the pass calculations.

Reviewers apply the authoritative contracts; they do not grade style,
likability, personality, accent, outcome, or agreement with the member's goal.

## Denominators

To prevent favorable denominator selection:

- **All signal cells** means five signals for every eligible session.
- **Assessed cells** means cells the adjudicated human reference marks non-null.
- **Null-reference cells** means cells the adjudicated human reference marks
  null.
- **Band-eligible sessions** means sessions with at least four adjudicated
  signals carrying sufficient evidence and an eligible session purpose.
- No invalid, missing, timed-out, or disagreeing result may be silently removed.
  Its disposition must be recorded before metrics are calculated.

Percentages are raw counts divided by the complete applicable denominator.
Rounding never converts a miss into a pass.

## Pass bar

The evaluator passes only when every section below passes in the same frozen
cohort and every zero-tolerance count is zero.

### 1. Evidence integrity — 100%

- Every cited snippet is an exact substring of a referenced current-session
  turn or an exact timestamp-backed behavioral event.
- Every assigned level has the evidence required by its anchor.
- Every null has one bounded reason supported by the session conditions.
- No prior session, Living Profile, coach memory, or other member's data is
  used to assign the current level.

One fabricated, paraphrased-as-quote, untraceable, or out-of-session evidence
reference is a zero-tolerance violation.

### 2. Null-default compliance — 100%

- Composure is null whenever the human reference finds no friction event.
- Adaptability is null whenever the human reference finds no shift, objection,
  or new information.
- `insufficient` evidence produces null, never level 0.
- Null never participates in band derivation or a trend.

### 3. Human agreement

Across the complete Stage 2 cohort:

| Measure | Minimum |
|---|---:|
| Assessed-vs-null agreement across all signal cells | 90% |
| Exact evidence-strength agreement across all signal cells | 85% |
| Exact level agreement across assessed cells | 80% |
| Level agreement within one level across assessed cells | 95% |
| Exact overall-band agreement across band-eligible sessions | 85% |

In addition, no signal may fall below 75% assessed-vs-null agreement or 70%
exact level agreement when that signal has at least ten applicable cells. This
prevents strong performance on one signal from hiding failure on another.

### 4. High-risk anchor compliance — 100%

- Every level 0 has observable breakdown plus a meaningful recovery
  opportunity, exactly as required by READINESS-ANCHORS-001.
- Every level 4 has meaningful scenario pressure or a documented
  member-created test; calm fluency alone is not level 4.
- Delivery metrics may support a judgment but never determine a readiness level
  alone.
- The evaluator never inflates or suppresses a level for encouragement,
  retention, or tone management.

### 5. Run-to-run stability

Select five representative sessions spanning at least three scenario families,
including one expected-null case and one meaningful-pressure case. Evaluate
each session three times with identical frozen inputs.

| Measure | Minimum |
|---|---:|
| Assessed-vs-null decision stability across repeated signal cells | 95% |
| Exact evidence-strength stability across repeated signal cells | 85% |
| Exact level stability across repeated assessed cells | 85% |
| Level stability within one level across repeated assessed cells | 100% |
| Evidence traceability across all repeats | 100% |

The exact supporting snippet may vary between valid current-session evidence
references. It may never become fabricated, external, or contradictory to the
assigned anchor.

### 6. Band and claim safety — 100%

- Bands are derived by code from sufficient signal rows; the model never
  selects an overall band.
- Sessions with fewer than four sufficient signals receive no overall band.
- Focused drills, text exercises, priming rituals, and field log-backs receive
  no overall band.
- No output contains a 0–100 score, cross-member comparison, personality claim,
  demographic inference, diagnosis, or guarantee of real-world success.

### 7. Operational integrity — 100%

- Every evaluated session belongs to an exact consented UUID on the allowlist.
- At most one paid shadow run exists for a session, rubric version, and
  revision.
- Every run records requested and actual model, evaluator and rubric versions,
  provider-reported token usage, terminal outcome, and sanitized error code.
- Prompts and raw model output are not persisted.
- No audit run remains `pending` for more than ten minutes without a documented
  platform incident and reconciliation before the cohort can pass.
- Account reset/deletion removes the member's private readiness and shadow-audit
  rows without changing the public six-column reset contract.
- Security-advisor findings show no regression from the recorded pre-apply
  baseline.

## Zero-tolerance violations

Any one of the following fails the cohort immediately:

1. Fabricated, untraceable, prior-session, or cross-member evidence.
2. Null converted to level 0 or used in a band or trend.
3. A non-null Composure result without friction or a non-null Adaptability
   result without a shift.
4. A level 0 without breakdown plus recovery opportunity, or a level 4 without
   meaningful pressure/member-created test.
5. Personality, demographic, diagnostic, comparative, or outcome-guarantee
   inference.
6. Evaluation of a member not explicitly consented and allowlisted.
7. Any readiness output, internal level, evidence, band, error, or eligibility
   state exposed to a member.
8. Duplicate paid evaluation for the same session, rubric version, and
   revision.
9. Persisted prompt or raw model output.
10. An ownership or RLS breach.

## Outcome and fail paths

### Pass

All coverage requirements, numerical thresholds, operational checks, and
zero-tolerance rules pass in one frozen evaluator-version cohort.

**Effect:** the Founder may review the packet and decide whether to authorize a
separate, limited member-display phase. Nothing becomes member-facing
automatically. Shadow mode and service-role-only access remain unchanged until
that later decision.

### Revise and repeat

Use this outcome when coverage is complete and no zero-tolerance violation
occurred, but one or more numerical thresholds were missed.

- Member display remains blocked.
- Diagnose the missed signal, evidence rule, or stability failure.
- Any prompt, model, schema, or evaluator change receives a new evaluator
  version.
- Run Stage 1 again and collect a fresh Stage 2 cohort. Prior results may inform
  diagnosis but cannot be pooled into the new pass calculation.

### Halt

Use this outcome for any zero-tolerance violation or a repeated failure of the
same threshold across two consecutive evaluator versions.

- Set `READINESS_SHADOW_ENABLED=false`.
- Remove production cohort UUIDs from the allowlist.
- Quarantine the affected audit packet; do not delete immutable evidence needed
  for incident review unless account deletion requires it.
- Confirm that no member-facing output occurred.
- Record root cause and corrective action.
- Resume only after a new Founder authorization naming the corrected boundary.

### Insufficient coverage

Use this outcome when sample or scenario coverage is incomplete. Do not call it
a pass or a fail. Keep member display blocked and collect only the missing
coverage under the same frozen evaluator version.

## Founder acceptance packet

The packet presented for a pass decision contains no member-facing release and
no raw member content outside the controlled review surface. It includes:

1. evaluator version, prompt hash, model, model snapshot, rubric version, and
   cohort dates;
2. consent and allowlist attestation;
3. fixture results;
4. cohort coverage counts by scenario family and pressure level;
5. every numerator, denominator, and threshold result in this contract;
6. per-signal confusion tables for null/assessed and levels 0–4;
7. stability results;
8. zero-tolerance count and any incident record;
9. duplicate, pending-run, deletion, RLS, and security-advisor checks; and
10. the explicit recommendation: pass, revise and repeat, halt, or insufficient
    coverage.

## Change control

- Decision 065 makes v0.1.0 authoritative for shadow validation only.
- Threshold changes require a new contract version and cannot be applied
  retroactively to rescue a cohort.
- Changes to READINESS-MEASUREMENT-001 or READINESS-ANCHORS-001 require a new
  evaluator version and a fresh validation cohort.
- No builder, reviewer, or model may waive a zero-tolerance rule.
