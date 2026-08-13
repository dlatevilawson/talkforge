/**
 * Adaptive assessment — diagnostic synthesis + legacy compatibility projection.
 *
 * Pipeline (one direction only):
 *   accepted user evidence → diagnostic synthesis → legacy compatibility projection
 *
 * Synthesized compatibility values are derived output, never user evidence.
 * They must not feed further inference, hypothesis, or questioning.
 */

import type {
  AssessmentSlotId,
  AssessmentSlotsState,
  AssessmentLifecycleState,
} from "./assessment-lifecycle.ts";

export type AssessmentAnswerSource = "user" | "synthesized";

export type AssessmentDiagnosis = {
  primaryBottleneck: string;
  supportingPatterns: string[];
  contexts: string;
  evidence: string;
  desiredOutcome: string;
  practiceCommitment: string;
  /** 0–1 style confidence from evidence density — not clinical certainty. */
  confidence: number;
  mechanismId: AssessmentMechanismId | null;
};

export type AssessmentMechanismId =
  | "verbal_retrieval"
  | "thought_organization"
  | "over_explaining"
  | "hyper_self_monitoring"
  | "freeze_under_pressure"
  | "appease_conflict"
  | "defensive_escalation"
  | "authority_shrinking"
  | "audience_mismatch"
  | "group_timing_lag"
  | "small_talk_initiation"
  | "spotlight_anxiety"
  | "unspecified";

export type GenuineEvidenceCoverage = {
  bottleneck: boolean;
  context: boolean;
  pattern: boolean;
  outcome: boolean;
  practice: boolean;
  example: boolean;
  /** True only when required genuine dimensions are covered by USER evidence. */
  sufficient: boolean;
};

function norm(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'")
    .replace(/\s+/g, " ");
}

/** Collect only user-sourced accepted answers. Synthesized slots are ignored. */
export function collectUserEvidence(
  slots: AssessmentSlotsState
): Partial<Record<AssessmentSlotId, string>> {
  const out: Partial<Record<AssessmentSlotId, string>> = {};
  for (const id of Object.keys(slots) as AssessmentSlotId[]) {
    const slot = slots[id];
    if (slot?.status !== "filled") continue;
    if (slot.source === "synthesized") continue;
    const answer = slot.answer?.trim();
    if (!answer) continue;
    out[id] = answer;
  }
  return out;
}

function joinedEvidence(
  evidence: Partial<Record<AssessmentSlotId, string>>
): string {
  return Object.values(evidence)
    .filter(Boolean)
    .join(" \n ");
}

function detectMechanism(t: string): AssessmentMechanismId | null {
  if (
    /\b(can'?t find the words|cannot find the words|words disappear|know what i (mean|want to say)|know what i want|word.?finding|can'?t get the words)\b/.test(
      t
    )
  ) {
    return "verbal_retrieval";
  }
  if (
    /\b(too many (thoughts|ideas)|jumbled|scrambled|organize|organis|scattered|all at once)\b/.test(
      t
    )
  ) {
    return "thought_organization";
  }
  if (
    /\b(ramble|rambling|over.?explain|too much (detail|background)|go on (and on|too long)|can'?t get to the point)\b/.test(
      t
    )
  ) {
    return "over_explaining";
  }
  if (
    /\b(freeze|freezing|go blank|mind goes blank|blank when|shut down)\b/.test(t) &&
    /\b(boss|manager|authority|watched|spot|pressure|put on the spot)\b/.test(t)
  ) {
    return "freeze_under_pressure";
  }
  if (/\b(freeze|freezing|go blank|mind goes blank)\b/.test(t)) {
    return "freeze_under_pressure";
  }
  if (
    /\b(small talk)\b/.test(t) &&
    /\b(join|joining|start|initiate|don'?t know what to say|nothing to say)\b/.test(
      t
    )
  ) {
    return "small_talk_initiation";
  }
  if (/\b(small talk)\b/.test(t)) {
    return "small_talk_initiation";
  }
  if (
    /\b(after(wards)?|too late|topic (has )?moved|miss(ed)? (my )?turn|group)\b/.test(
      t
    )
  ) {
    return "group_timing_lag";
  }
  if (
    /\b(boss|manager|authority|senior|executive)\b/.test(t) &&
    /\b(shrink|smaller|quiet|nervous|intimidate)\b/.test(t)
  ) {
    return "authority_shrinking";
  }
  if (/\b(avoid|appease|people.?pleas|don'?t push back|conflict)\b/.test(t)) {
    return "appease_conflict";
  }
  if (/\b(watched|spotlight|everyone looking|on stage)\b/.test(t)) {
    return "spotlight_anxiety";
  }
  if (/\b(overthink|self.?conscious|monitoring myself|second.?guess)\b/.test(t)) {
    return "hyper_self_monitoring";
  }
  return null;
}

function hasContext(t: string): boolean {
  return /\b(work|office|job|meeting|meetings|standup|presentation|client|manager|boss|coworker|colleague|team|leadership|interview|date|partner|family|friend|friends|school|zoom|phone|call|home|party|networking|small talk|stranger|strangers|hallway|everyday)\b/i.test(
    t
  );
}

function hasExample(t: string): boolean {
  return /\b(yesterday|today|last (week|night|monday|tuesday|wednesday|thursday|friday|weekend|month)|this morning|earlier|recently|my (manager|boss|coworker|colleague|client|friend|partner)|they asked|she asked|he asked)\b/i.test(
    t
  );
}

function hasOutcome(t: string): boolean {
  return /\b(want to be able|able to|more clearly|without freezing|get to the point|comfortably|hold my own|answer clearly|speak up|join in)\b/i.test(
    t
  );
}

function hasPractice(t: string): boolean {
  return /\b(\d+\s*(min|mins|minute|minutes|hour|hours)|half an hour|a few minutes|every day|each day|daily|per day|once a (day|week))\b/i.test(
    t
  );
}

function hasPattern(t: string): boolean {
  return (
    detectMechanism(t) != null ||
    /\b(usually|tend to|always|often|when i|happens|freeze|ramble|blank|lose|over.?explain)\b/i.test(
      t
    )
  );
}

/** Genuine evidence coverage from USER answers only. */
export function assessGenuineEvidenceCoverage(
  evidence: Partial<Record<AssessmentSlotId, string>>
): GenuineEvidenceCoverage {
  const t = norm(joinedEvidence(evidence));
  const bottleneck = detectMechanism(t) != null || Boolean(evidence.skill_to_improve && detectMechanism(norm(evidence.skill_to_improve)));
  // Skill alone like "small talk" counts as weak bottleneck seed if mechanism also present OR small talk + any pattern wording
  const bottleneckOk =
    bottleneck ||
    (/\bsmall talk\b/.test(t) && hasPattern(t)) ||
    (Boolean(evidence.what_goes_wrong) && hasPattern(norm(evidence.what_goes_wrong ?? ""))) ||
    (Boolean(evidence.behavior_to_change) && hasPattern(norm(evidence.behavior_to_change ?? "")));

  const context =
    hasContext(t) || Boolean(evidence.where_it_shows_up && hasContext(norm(evidence.where_it_shows_up)));
  const pattern =
    hasPattern(t) ||
    Boolean(evidence.what_goes_wrong) ||
    Boolean(evidence.behavior_to_change);
  const outcome =
    hasOutcome(t) ||
    Boolean(evidence.six_week_success && evidence.six_week_success.trim().length >= 12);
  const practice =
    hasPractice(t) ||
    Boolean(evidence.practice_time && hasPractice(norm(evidence.practice_time)));
  const example =
    hasExample(t) ||
    Boolean(
      evidence.recent_missed_conversation &&
        evidence.recent_missed_conversation.trim().length >= 20 &&
        (hasExample(norm(evidence.recent_missed_conversation)) ||
          hasContext(norm(evidence.recent_missed_conversation)))
    );

  // Example waived only when other dimensions are strong and user never offered a moment
  // but described a recurring situation with a person/place (still prefer real example).
  const exampleOk = example || (bottleneckOk && context && pattern && hasContext(t));

  const sufficient =
    bottleneckOk && context && pattern && outcome && practice && exampleOk;

  return {
    bottleneck: bottleneckOk,
    context,
    pattern,
    outcome,
    practice,
    example: exampleOk,
    sufficient,
  };
}

function mechanismLabel(id: AssessmentMechanismId | null): string {
  switch (id) {
    case "verbal_retrieval":
      return "Turning a clear internal thought into words quickly during spontaneous conversation";
    case "thought_organization":
      return "Organizing too many thoughts into one clear spoken point";
    case "over_explaining":
      return "Over-explaining and weak prioritization of the core point";
    case "freeze_under_pressure":
      return "Freezing or going blank when put on the spot, especially under status pressure";
    case "small_talk_initiation":
      return "Starting and joining everyday small talk without a prepared script";
    case "group_timing_lag":
      return "Timing contributions in group conversation before the topic moves on";
    case "authority_shrinking":
      return "Shrinking or under-communicating around higher-status listeners";
    case "appease_conflict":
      return "Avoiding clear pushback in tension or disagreement";
    case "spotlight_anxiety":
      return "Losing fluency when feeling observed or spotlighted";
    case "hyper_self_monitoring":
      return "Over-monitoring yourself while speaking, which interrupts flow";
    case "audience_mismatch":
      return "Mismatch between what the audience needs and how the update is framed";
    case "defensive_escalation":
      return "Escalating defensively when challenged";
    default:
      return "Expressing ideas clearly in spontaneous conversation";
  }
}

function inferContext(t: string, evidence: Partial<Record<AssessmentSlotId, string>>): string {
  if (evidence.where_it_shows_up?.trim()) return evidence.where_it_shows_up.trim();
  if (/\bsmall talk\b/.test(t)) {
    return "Everyday conversation and small talk, especially without preparation";
  }
  if (/\b(boss|manager)\b/.test(t) && /\b(meeting|spot|ask)\b/.test(t)) {
    return "Work conversations with a manager or when put on the spot";
  }
  if (/\b(meeting|meetings|work)\b/.test(t)) {
    return "Work meetings and on-the-spot workplace conversation";
  }
  if (/\b(friend|family|date)\b/.test(t)) {
    return "Personal conversations with people you know";
  }
  return "Everyday conversation";
}

function inferPattern(id: AssessmentMechanismId | null, t: string): string {
  switch (id) {
    case "verbal_retrieval":
      return "You often know roughly what you mean but struggle to retrieve and organize the words quickly enough, which can cause hesitation or incomplete explanations.";
    case "thought_organization":
      return "Several ideas arrive at once, and it is hard to filter them into one clear spoken point in the moment.";
    case "over_explaining":
      return "You add background and side detail before the core point, which can bury the message.";
    case "freeze_under_pressure":
      return "Under pressure or status observation, thinking stalls and words become harder to access.";
    case "small_talk_initiation":
      return "In casual conversation, initiating or joining feels hard — often because a clear next line does not come quickly.";
    default:
      if (/\b(freeze|blank)\b/.test(t)) {
        return "In the moment, speaking stalls and it becomes hard to continue smoothly.";
      }
      if (/\b(ramble|over.?explain)\b/.test(t)) {
        return "Explanations tend to expand past the core point.";
      }
      return "Spoken delivery breaks down relative to what you intended to say.";
  }
}

function inferOutcome(
  evidence: Partial<Record<AssessmentSlotId, string>>,
  id: AssessmentMechanismId | null
): string {
  if (evidence.six_week_success?.trim()) return evidence.six_week_success.trim();
  switch (id) {
    case "verbal_retrieval":
      return "Respond more fluidly in conversation and express one clear thought without needing extensive preparation.";
    case "over_explaining":
      return "Lead with the core point and keep explanations tighter in meetings.";
    case "freeze_under_pressure":
      return "Stay able to answer clearly when put on the spot by a manager or group.";
    case "small_talk_initiation":
      return "Join everyday small talk with a simple opening and keep the exchange moving.";
    default:
      return "Speak more clearly and deliberately in the situations that currently break down.";
  }
}

function inferPractice(
  evidence: Partial<Record<AssessmentSlotId, string>>
): string {
  if (evidence.practice_time?.trim()) return evidence.practice_time.trim();
  return "";
}

function inferEvidenceLine(
  evidence: Partial<Record<AssessmentSlotId, string>>,
  t: string
): string {
  if (evidence.recent_missed_conversation?.trim()) {
    return evidence.recent_missed_conversation.trim();
  }
  if (hasExample(t)) {
    // Pull a short clause from user evidence rather than inventing an incident.
    const fromSkill = evidence.skill_to_improve?.trim();
    const fromWrong = evidence.what_goes_wrong?.trim();
    return fromWrong || fromSkill || "Recurring pattern described across recent conversations.";
  }
  return "Pattern described across conversations; no single incident named.";
}

/** Build diagnosis from USER evidence only. Never reads synthesized slots. */
export function synthesizeDiagnosis(
  evidence: Partial<Record<AssessmentSlotId, string>>
): AssessmentDiagnosis {
  const t = norm(joinedEvidence(evidence));
  const mechanismId = detectMechanism(t);
  const coverage = assessGenuineEvidenceCoverage(evidence);

  let confidence = 0.25;
  if (coverage.bottleneck) confidence += 0.15;
  if (coverage.context) confidence += 0.1;
  if (coverage.pattern) confidence += 0.1;
  if (coverage.example) confidence += 0.15;
  if (coverage.outcome) confidence += 0.1;
  if (coverage.practice) confidence += 0.1;
  if (mechanismId && mechanismId !== "unspecified") confidence += 0.05;
  confidence = Math.min(0.95, confidence);

  const primaryBottleneck = mechanismLabel(mechanismId);
  const contexts = inferContext(t, evidence);
  const pattern = inferPattern(mechanismId, t);
  const supportingPatterns = [pattern];
  if (/\b(boss|manager|authority)\b/.test(t) && mechanismId === "freeze_under_pressure") {
    supportingPatterns.push(
      "Status pressure appears to worsen retrieval and composure."
    );
  }
  if (/\bsmall talk\b/.test(t) && mechanismId === "verbal_retrieval") {
    supportingPatterns.push(
      "The friction shows up strongly in unscripted social exchange."
    );
  }

  return {
    primaryBottleneck,
    supportingPatterns,
    contexts,
    evidence: inferEvidenceLine(evidence, t),
    desiredOutcome: inferOutcome(evidence, mechanismId),
    practiceCommitment: inferPractice(evidence),
    confidence,
    mechanismId,
  };
}

/**
 * Project diagnosis into empty legacy slots only.
 * Never overwrites a user-sourced answer.
 */
export function projectCompatibilityAnswers(
  evidence: Partial<Record<AssessmentSlotId, string>>,
  diagnosis: AssessmentDiagnosis
): Partial<Record<AssessmentSlotId, string>> {
  const projected: Partial<Record<AssessmentSlotId, string>> = {};
  const setIfEmpty = (id: AssessmentSlotId, value: string) => {
    if (evidence[id]?.trim()) return;
    if (!value.trim()) return;
    projected[id] = value.trim();
  };

  setIfEmpty("skill_to_improve", diagnosis.primaryBottleneck);
  setIfEmpty("where_it_shows_up", diagnosis.contexts);
  setIfEmpty("what_goes_wrong", diagnosis.supportingPatterns[0] ?? "");
  setIfEmpty(
    "behavior_to_change",
    diagnosis.supportingPatterns[1] ??
      diagnosis.supportingPatterns[0] ??
      diagnosis.primaryBottleneck
  );
  setIfEmpty("recent_missed_conversation", diagnosis.evidence);
  setIfEmpty("six_week_success", diagnosis.desiredOutcome);
  setIfEmpty("practice_time", diagnosis.practiceCommitment);

  return projected;
}

/**
 * When genuine user evidence is sufficient, fill empty slots with synthesized
 * compatibility values (source=synthesized). User answers are preserved.
 */
export function applyCompatibilityProjection(
  state: AssessmentLifecycleState
): AssessmentLifecycleState {
  const evidence = collectUserEvidence(state.slots);
  const coverage = assessGenuineEvidenceCoverage(evidence);
  if (!coverage.sufficient) return state;

  const diagnosis = synthesizeDiagnosis(evidence);
  // Practice must be genuine — do not invent a practice commitment.
  if (!diagnosis.practiceCommitment.trim()) return state;

  const projected = projectCompatibilityAnswers(evidence, diagnosis);
  const slots = { ...state.slots };
  let changed = false;

  for (const id of Object.keys(projected) as AssessmentSlotId[]) {
    const value = projected[id];
    if (!value) continue;
    const current = slots[id];
    if (current?.status === "filled" && current.source !== "synthesized") {
      continue;
    }
    if (current?.status === "filled" && current.answer === value) continue;
    slots[id] = {
      id,
      status: "filled",
      answer: value,
      source: "synthesized",
    };
    changed = true;
  }

  if (!changed) return state;
  return { ...state, slots };
}

/** True when user evidence is enough to project + complete. */
export function canCompleteWithDiagnosticEvidence(
  state: AssessmentLifecycleState
): boolean {
  const evidence = collectUserEvidence(state.slots);
  const coverage = assessGenuineEvidenceCoverage(evidence);
  if (!coverage.sufficient) return false;
  // Practice commitment must exist as user evidence (never synthesized into existence).
  return Boolean(evidence.practice_time && hasPractice(norm(evidence.practice_time)));
}

/** Member-facing diagnosis lines for results UI / LP. */
export function formatDiagnosisForProfile(diagnosis: AssessmentDiagnosis): {
  goals: string[];
  challenges: string[];
  purposeStatement: string | null;
  provenanceClaim: string;
} {
  const challenges = [
    diagnosis.contexts,
    diagnosis.supportingPatterns[0],
    diagnosis.evidence,
  ].filter((x): x is string => Boolean(x && x.trim()));

  return {
    goals: [diagnosis.primaryBottleneck],
    challenges,
    purposeStatement: diagnosis.desiredOutcome || null,
    provenanceClaim: diagnosis.practiceCommitment
      ? `Adaptive assessment diagnosis (confidence ${diagnosis.confidence.toFixed(2)}). Practice: ${diagnosis.practiceCommitment}`
      : `Adaptive assessment diagnosis (confidence ${diagnosis.confidence.toFixed(2)}).`,
  };
}
