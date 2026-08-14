/**
 * Adaptive assessment — diagnostic synthesis + legacy compatibility projection.
 *
 * Pipeline (one direction only):
 *   accepted user evidence → candidate mechanisms (support/refute/unresolved)
 *   → diagnosis claims (only if evidence- or tested-inference-backed)
 *   → legacy compatibility projection
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

export type MechanismEvidenceStatus = "supported" | "refuted" | "unresolved";

export type MechanismCandidate = {
  id: AssessmentMechanismId;
  status: MechanismEvidenceStatus;
  /** Accepted-evidence snippets that support this candidate. */
  supportingEvidence: string[];
  /** Accepted-evidence snippets that refute this candidate. */
  refutingEvidence: string[];
  /** True when a distinguishing contrast was present in accepted evidence. */
  tested: boolean;
};

export type TrainingImplication = {
  id: string;
  statement: string;
  mechanismId: AssessmentMechanismId | null;
  evidenceRefs: string[];
};

export type AssessmentDiagnosis = {
  /** Legacy compatibility fields (projection / older consumers). */
  primaryBottleneck: string;
  supportingPatterns: string[];
  contexts: string;
  evidence: string;
  desiredOutcome: string;
  practiceCommitment: string;
  /** 0–1 confidence from evidence density — not clinical certainty. */
  confidence: number;
  /** Primary mechanism when distinguished; null when uncertain / competing. */
  mechanismId: AssessmentMechanismId | null;

  /** Diagnostic Integrity v2 member-facing fields. */
  focusArea: string;
  keyEnvironments: string;
  rootPattern: string;
  dailyCommitment: string;
  trainingImplications: TrainingImplication[];
  uncertainty: string | null;
  competingMechanisms: MechanismCandidate[];
};

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

export type AcceptedEvidenceFact = {
  slotId: AssessmentSlotId | "derived";
  text: string;
  kind:
    | "aspiration"
    | "context"
    | "mechanism"
    | "example"
    | "outcome"
    | "practice"
    | "contrast";
};

function norm(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'")
    .replace(/\s+/g, " ");
}

function isInteractionSignalOnly(text: string): boolean {
  const t = norm(text);
  if (!t) return true;
  if (
    /^(i don'?t know|i do not know|i can'?t remember|i cannot remember|not sure|no idea)([.!]|$)/.test(
      t
    )
  ) {
    return true;
  }
  if (
    /^(i don'?t know|i can'?t remember|i cannot remember)\b/.test(t) &&
    t.split(/\s+/).length <= 6
  ) {
    return true;
  }
  return false;
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
    if (isInteractionSignalOnly(answer)) continue;
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

/** Parse accepted user answers into typed facts (no synthesis yet). */
export function extractAcceptedEvidenceFacts(
  evidence: Partial<Record<AssessmentSlotId, string>>
): AcceptedEvidenceFact[] {
  const facts: AcceptedEvidenceFact[] = [];
  const push = (
    slotId: AssessmentSlotId,
    kind: AcceptedEvidenceFact["kind"]
  ) => {
    const text = evidence[slotId]?.trim();
    if (!text || isInteractionSignalOnly(text)) return;
    facts.push({ slotId, text, kind });
  };

  push("skill_to_improve", "aspiration");
  push("where_it_shows_up", "context");
  push("what_goes_wrong", "mechanism");
  push("behavior_to_change", "mechanism");
  push("recent_missed_conversation", "example");
  push("six_week_success", "outcome");
  push("practice_time", "practice");

  const t = norm(joinedEvidence(evidence));
  // Distinguishing contrasts count as tested inferences only when present in evidence.
  if (
    /\b(know what i (mean|want to say)|words (don'?t|do not|won'?t|will not) come|can'?t find the words|cannot find the words)\b/.test(
      t
    ) &&
    /\b(writ(e|ing)|prepare[sd]?|script|notes)\b/.test(t)
  ) {
    facts.push({
      slotId: "derived",
      text: "Writing or preparing first materially improves spoken delivery",
      kind: "contrast",
    });
  }
  if (
    /\b(blank|scrambled|too many thoughts|can'?t find the words|know what i mean)\b/.test(
      t
    ) &&
    /\b(or|vs|versus|rather than|instead of|more that|is it more)\b/.test(t)
  ) {
    facts.push({
      slotId: "derived",
      text: "User engaged a mechanism contrast in accepted evidence",
      kind: "contrast",
    });
  }

  return facts;
}

function hasContext(t: string): boolean {
  return /\b(work|office|job|meeting|meetings|standup|presentation|client|manager|boss|coworker|colleague|team|leadership|interview|date|partner|family|friend|friends|school|zoom|phone|call|home|party|networking|small talk|stranger|strangers|hallway|everyday|group)\b/i.test(
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

function hasMechanismSignal(t: string): boolean {
  return /\b(usually|tend to|always|often|when i|happens|freeze|ramble|blank|lose|over.?explain|words|thoughts|point|join|timing|too late|pressure|spot|retrieve|organize|filter)\b/i.test(
    t
  );
}

function isAspirationOnly(evidence: Partial<Record<AssessmentSlotId, string>>): boolean {
  const skill = norm(evidence.skill_to_improve ?? "");
  if (!skill) return false;
  const aspirationOnly =
    /\b(get better at small talk|better at small talk|improve (my )?small talk|small talk)\b/.test(
      skill
    ) &&
    !/\b(words|freeze|blank|ramble|point|join|start|initiate|pressure|thought)\b/.test(
      skill
    );
  const hasDeeper =
    Boolean(evidence.what_goes_wrong?.trim()) ||
    Boolean(evidence.behavior_to_change?.trim()) ||
    Boolean(evidence.recent_missed_conversation?.trim());
  return aspirationOnly && !hasDeeper;
}

/** Score mechanism candidates from accepted evidence (support / refute / unresolved). */
export function scoreMechanismCandidates(
  evidence: Partial<Record<AssessmentSlotId, string>>,
  facts: AcceptedEvidenceFact[]
): MechanismCandidate[] {
  const t = norm(joinedEvidence(evidence));
  const snippets = facts.map((f) => f.text);

  const candidate = (
    id: AssessmentMechanismId,
    supportRe: RegExp,
    refuteRe?: RegExp,
    testedRe?: RegExp
  ): MechanismCandidate | null => {
    const supportingEvidence = snippets.filter((s) => supportRe.test(norm(s)));
    const refutingEvidence = refuteRe
      ? snippets.filter((s) => refuteRe.test(norm(s)))
      : [];
    const tested =
      Boolean(testedRe && testedRe.test(t)) ||
      facts.some((f) => f.kind === "contrast" && supportRe.test(norm(f.text)));

    if (supportingEvidence.length === 0 && refutingEvidence.length === 0) {
      return null;
    }

    let status: MechanismEvidenceStatus = "unresolved";
    if (refutingEvidence.length > 0 && supportingEvidence.length === 0) {
      status = "refuted";
    } else if (supportingEvidence.length > 0 && refutingEvidence.length === 0) {
      status = tested || supportingEvidence.length >= 1 ? "supported" : "unresolved";
      // Weak single aspiration mention without mechanism detail stays unresolved.
      if (
        id === "small_talk_initiation" &&
        isAspirationOnly(evidence) &&
        supportingEvidence.length <= 1
      ) {
        status = "unresolved";
      }
    } else if (supportingEvidence.length > 0 && refutingEvidence.length > 0) {
      status = "unresolved";
    }

    return {
      id,
      status,
      supportingEvidence,
      refutingEvidence,
      tested: tested || (status === "supported" && supportingEvidence.length >= 2),
    };
  };

  const out: MechanismCandidate[] = [];

  const retrieval = candidate(
    "verbal_retrieval",
    /\b(can'?t find the words|cannot find the words|words (disappear|don'?t|do not|won'?t|will not) come|know what i (mean|want to say)|word.?finding|can'?t get the words|words slow)\b/,
    /\b(no idea what to say|mind (is )?blank of ideas|don'?t have (any )?ideas|thought itself feels scrambled|too many (thoughts|ideas) and no core)\b/,
    /\b(writ(e|ing)|prepare[sd]?|notes|script).{0,40}\b(better|easier|help)|know what i (mean|want).{0,40}words\b/
  );
  if (retrieval) out.push(retrieval);

  const ideaGen = candidate(
    "thought_organization",
    /\b(too many (thoughts|ideas)|jumbled|scrambled|organize|organis|scattered|all at once|don'?t know what i think|idea.?generation|no clear thought)\b/,
    /\b(know what i (mean|want to say)|idea is clear|thought is clear|words (don'?t|won'?t) come)\b/,
    /\b(blank|scrambled|too many thoughts|words).{0,30}\b(or|vs|versus)\b/
  );
  if (ideaGen) out.push(ideaGen);

  const overExplain = candidate(
    "over_explaining",
    /\b(ramble|rambling|over.?explain|too much (detail|background)|go on (and on|too long)|can'?t get to the point|bury(ing)? the (point|ask))\b/
  );
  if (overExplain) out.push(overExplain);

  const freeze = candidate(
    "freeze_under_pressure",
    /\b(freeze|freezing|go blank|mind goes blank|blank when|shut down|put on the spot)\b/
  );
  if (freeze) out.push(freeze);

  const groupTiming = candidate(
    "group_timing_lag",
    /\b(too late|topic (has )?moved|miss(ed)? (my )?turn|after(wards)?|group conversation|join(ing)? (in|the) (group|conversation)|timing)\b/
  );
  if (groupTiming) out.push(groupTiming);

  const smallTalk = candidate(
    "small_talk_initiation",
    /\b(small talk|join(ing)? in|start(ing)? (a )?conversation|opening line|hallway)\b/
  );
  if (smallTalk) out.push(smallTalk);

  const authority = candidate(
    "authority_shrinking",
    /\b(boss|manager|authority|senior|executive).{0,40}\b(shrink|smaller|quiet|nervous|intimidate)\b|\b(shrink|smaller|quiet).{0,40}\b(boss|manager|authority)\b/
  );
  if (authority) out.push(authority);

  const appease = candidate(
    "appease_conflict",
    /\b(avoid|appease|people.?pleas|don'?t push back|conflict|say no)\b/
  );
  if (appease) out.push(appease);

  const spotlight = candidate(
    "spotlight_anxiety",
    /\b(watched|spotlight|everyone looking|on stage)\b/
  );
  if (spotlight) out.push(spotlight);

  const selfMon = candidate(
    "hyper_self_monitoring",
    /\b(overthink|self.?conscious|monitoring myself|second.?guess)\b/
  );
  if (selfMon) out.push(selfMon);

  const audience = candidate(
    "audience_mismatch",
    /\b(calibrat|audience need|skeptical|lead with what they need|frame(d|ing)? for)\b/
  );
  if (audience) out.push(audience);

  // If retrieval support includes writing-helps contrast, refute pure idea-generation.
  if (retrieval && /\bwrit(e|ing)|prepare[sd]?|notes|script\b/.test(t)) {
    const idea = out.find((c) => c.id === "thought_organization");
    if (idea && idea.status !== "supported") {
      idea.status = "refuted";
      idea.refutingEvidence = [
        ...idea.refutingEvidence,
        "Writing/preparing first improves delivery — points to retrieval, not missing ideas",
      ];
    }
    retrieval.tested = true;
    retrieval.status = "supported";
  }

  // Ambiguous retrieval vs idea-generation: both plausible, neither uniquely tested.
  const ret = out.find((c) => c.id === "verbal_retrieval");
  const idea = out.find((c) => c.id === "thought_organization");
  if (
    ret &&
    idea &&
    ret.status === "supported" &&
    idea.status === "supported" &&
    !ret.tested &&
    !idea.tested
  ) {
    ret.status = "unresolved";
    idea.status = "unresolved";
  }

  return out;
}

function mechanismLabel(id: AssessmentMechanismId | null): string {
  switch (id) {
    case "verbal_retrieval":
      return "Turning a clear internal thought into words quickly during spontaneous conversation";
    case "thought_organization":
      return "Forming and organizing the idea itself before speaking";
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
      return "Spoken delivery breaks down relative to what you intended — mechanism still being clarified";
  }
}

function selectPrimaryMechanism(
  candidates: MechanismCandidate[]
): {
  mechanismId: AssessmentMechanismId | null;
  uncertainty: string | null;
  competing: MechanismCandidate[];
} {
  const supported = candidates.filter((c) => c.status === "supported");
  const unresolved = candidates.filter((c) => c.status === "unresolved");

  if (supported.length === 1) {
    return {
      mechanismId: supported[0].id,
      uncertainty: null,
      competing: candidates,
    };
  }

  if (supported.length > 1) {
    // Prefer tested support.
    const tested = supported.filter((c) => c.tested);
    if (tested.length === 1) {
      return {
        mechanismId: tested[0].id,
        uncertainty: null,
        competing: candidates,
      };
    }
    return {
      mechanismId: null,
      uncertainty: `Competing mechanisms remain plausible (${supported
        .map((c) => c.id)
        .join(", ")}); not distinguished yet.`,
      competing: candidates,
    };
  }

  // Retrieval vs idea-generation both unresolved → explicit uncertainty.
  const ret = unresolved.find((c) => c.id === "verbal_retrieval");
  const idea = unresolved.find((c) => c.id === "thought_organization");
  if (ret && idea) {
    return {
      mechanismId: null,
      uncertainty:
        "Evidence does not yet distinguish word retrieval from idea-generation difficulty.",
      competing: candidates,
    };
  }

  if (unresolved.length === 1 && unresolved[0].supportingEvidence.length >= 2) {
    return {
      mechanismId: unresolved[0].id,
      uncertainty:
        "Leading hypothesis only — distinguishing test still incomplete.",
      competing: candidates,
    };
  }

  if (unresolved.length >= 1) {
    return {
      mechanismId: null,
      uncertainty: `Mechanism still uncertain (${unresolved
        .map((c) => c.id)
        .join(", ")}).`,
      competing: candidates,
    };
  }

  return {
    mechanismId: null,
    uncertainty:
      "Insufficient accepted evidence to name a root mechanism yet.",
    competing: candidates,
  };
}

function inferContext(
  t: string,
  evidence: Partial<Record<AssessmentSlotId, string>>
): string {
  if (evidence.where_it_shows_up?.trim()) {
    return evidence.where_it_shows_up.trim();
  }
  const bits: string[] = [];
  if (/\b(boss|manager)\b/.test(t)) bits.push("manager / authority conversations");
  if (/\b(meeting|meetings|work)\b/.test(t)) bits.push("work meetings");
  if (/\bsmall talk|hallway|coworker\b/.test(t)) {
    bits.push("everyday / hallway conversation");
  }
  if (/\bgroup\b/.test(t)) bits.push("group conversation");
  if (bits.length) return bits.join("; ");
  if (hasContext(t)) return "Everyday conversation in the situations described";
  return "";
}

function inferPatternFromCandidates(
  mechanismId: AssessmentMechanismId | null,
  uncertainty: string | null,
  evidence: Partial<Record<AssessmentSlotId, string>>,
  t: string
): string {
  if (evidence.what_goes_wrong?.trim()) {
    const user = evidence.what_goes_wrong.trim();
    if (mechanismId) {
      return `${user} — consistent with ${mechanismLabel(mechanismId).toLowerCase()}.`;
    }
    if (uncertainty) {
      return `${user} — ${uncertainty}`;
    }
    return user;
  }
  if (uncertainty && !mechanismId) {
    return uncertainty;
  }
  switch (mechanismId) {
    case "verbal_retrieval":
      return "You often know roughly what you mean but struggle to retrieve the words quickly enough in real time.";
    case "thought_organization":
      return "The friction starts before wording — forming or filtering the idea itself under time pressure.";
    case "over_explaining":
      return "Explanations expand with background before the core point lands.";
    case "freeze_under_pressure":
      return "Under pressure or status observation, speaking stalls and words become harder to access.";
    case "group_timing_lag":
      return "By the time a contribution is ready, the group topic has often moved on.";
    case "small_talk_initiation":
      return "Initiating or joining casual exchange stalls without a ready opening line.";
    default:
      if (/\b(freeze|blank)\b/.test(t)) {
        return "In the moment, speaking stalls and it becomes hard to continue smoothly.";
      }
      return "Spoken delivery breaks down relative to what you intended to say.";
  }
}

function inferFocusArea(
  mechanismId: AssessmentMechanismId | null,
  uncertainty: string | null,
  evidence: Partial<Record<AssessmentSlotId, string>>,
  contexts: string
): string {
  // Never emit aspiration-only "small talk" as the focus.
  if (isAspirationOnly(evidence) || (!mechanismId && /\bsmall talk\b/.test(norm(evidence.skill_to_improve ?? "")))) {
    if (!mechanismId) {
      return "Unscripted conversation — mechanism still being clarified";
    }
  }
  if (mechanismId) return mechanismLabel(mechanismId);
  if (uncertainty) {
    return "Speaking under pressure — root mechanism not yet distinguished";
  }
  if (contexts) return `Clearer speaking in ${contexts}`;
  return "Clearer spontaneous speaking";
}

function inferOutcome(
  evidence: Partial<Record<AssessmentSlotId, string>>,
  id: AssessmentMechanismId | null
): string {
  if (evidence.six_week_success?.trim()) return evidence.six_week_success.trim();
  switch (id) {
    case "verbal_retrieval":
      return "Respond more fluidly in conversation and express one clear thought without needing extensive preparation.";
    case "thought_organization":
      return "Form one clear point quickly before speaking, even when ideas feel scrambled.";
    case "over_explaining":
      return "Lead with the core point and keep explanations tighter in meetings.";
    case "freeze_under_pressure":
      return "Stay able to answer clearly when put on the spot by a manager or group.";
    case "group_timing_lag":
      return "Enter group conversation earlier with one ready contribution.";
    case "small_talk_initiation":
      return "Join everyday small talk with a simple opening and keep the exchange moving.";
    default:
      return evidence.skill_to_improve?.trim() &&
        !isAspirationOnly(evidence)
        ? evidence.skill_to_improve.trim()
        : "Speak more clearly and deliberately in the situations that currently break down.";
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
    const ex = evidence.recent_missed_conversation.trim();
    if (!isInteractionSignalOnly(ex)) return ex;
  }
  if (hasExample(t)) {
    const fromWrong = evidence.what_goes_wrong?.trim();
    const fromSkill = evidence.skill_to_improve?.trim();
    if (fromWrong && !isInteractionSignalOnly(fromWrong)) return fromWrong;
    if (fromSkill && !isAspirationOnly(evidence)) return fromSkill;
  }
  const mech = evidence.what_goes_wrong?.trim() || evidence.behavior_to_change?.trim();
  if (mech) return mech;
  return "Pattern described across conversations; no single incident named.";
}

function buildTrainingImplications(
  mechanismId: AssessmentMechanismId | null,
  evidence: Partial<Record<AssessmentSlotId, string>>,
  contexts: string,
  uncertainty: string | null
): TrainingImplication[] {
  const refs: string[] = [];
  for (const id of [
    "what_goes_wrong",
    "behavior_to_change",
    "recent_missed_conversation",
    "where_it_shows_up",
    "skill_to_improve",
  ] as AssessmentSlotId[]) {
    const v = evidence[id]?.trim();
    if (v && !isInteractionSignalOnly(v)) refs.push(v);
  }

  if (uncertainty && !mechanismId) {
    return [
      {
        id: "clarify_mechanism",
        statement:
          "First training block should distinguish the competing mechanisms with short recognition drills before specializing.",
        mechanismId: null,
        evidenceRefs: refs.slice(0, 3),
      },
    ];
  }

  if (!mechanismId) return [];

  const env = contexts || "the situations already described";
  const byId: Partial<Record<AssessmentMechanismId, TrainingImplication>> = {
    verbal_retrieval: {
      id: "retrieval_realtime",
      statement: `Practice retrieving one clear spoken line in real time in ${env}, including when preparation is not available.`,
      mechanismId: "verbal_retrieval",
      evidenceRefs: refs.slice(0, 3),
    },
    thought_organization: {
      id: "idea_formation",
      statement: `Practice forming one core point before speaking in ${env}.`,
      mechanismId: "thought_organization",
      evidenceRefs: refs.slice(0, 3),
    },
    over_explaining: {
      id: "compression",
      statement: `Practice leading with the point and compressing background in ${env}.`,
      mechanismId: "over_explaining",
      evidenceRefs: refs.slice(0, 3),
    },
    freeze_under_pressure: {
      id: "pressure_response",
      statement: `Practice short answers under status or on-the-spot pressure in ${env}.`,
      mechanismId: "freeze_under_pressure",
      evidenceRefs: refs.slice(0, 3),
    },
    group_timing_lag: {
      id: "group_entry_timing",
      statement: `Practice entering group conversation earlier with one ready contribution in ${env}.`,
      mechanismId: "group_timing_lag",
      evidenceRefs: refs.slice(0, 3),
    },
    small_talk_initiation: {
      id: "small_talk_openings",
      statement: `Practice simple openings and joins in unscripted small talk in ${env}.`,
      mechanismId: "small_talk_initiation",
      evidenceRefs: refs.slice(0, 3),
    },
    audience_mismatch: {
      id: "audience_lead",
      statement: `Practice leading with what the audience needs first in ${env}.`,
      mechanismId: "audience_mismatch",
      evidenceRefs: refs.slice(0, 3),
    },
    authority_shrinking: {
      id: "authority_presence",
      statement: `Practice holding a clear point with higher-status listeners in ${env}.`,
      mechanismId: "authority_shrinking",
      evidenceRefs: refs.slice(0, 3),
    },
    appease_conflict: {
      id: "clear_pushback",
      statement: `Practice clear, calm pushback in tension without abandoning the point in ${env}.`,
      mechanismId: "appease_conflict",
      evidenceRefs: refs.slice(0, 3),
    },
    hyper_self_monitoring: {
      id: "reduce_self_monitor",
      statement: `Practice speaking one complete thought with less mid-sentence self-monitoring in ${env}.`,
      mechanismId: "hyper_self_monitoring",
      evidenceRefs: refs.slice(0, 3),
    },
    spotlight_anxiety: {
      id: "observed_fluency",
      statement: `Practice fluency while feeling observed in ${env}.`,
      mechanismId: "spotlight_anxiety",
      evidenceRefs: refs.slice(0, 3),
    },
    defensive_escalation: {
      id: "deescalate_response",
      statement: `Practice staying measured when challenged in ${env}.`,
      mechanismId: "defensive_escalation",
      evidenceRefs: refs.slice(0, 3),
    },
    unspecified: {
      id: "general_clarity",
      statement: `Practice clearer spontaneous speaking in ${env}.`,
      mechanismId: "unspecified",
      evidenceRefs: refs.slice(0, 3),
    },
  };

  const hit = byId[mechanismId];
  return hit ? [hit] : [];
}

/** Genuine evidence coverage from USER answers only. */
export function assessGenuineEvidenceCoverage(
  evidence: Partial<Record<AssessmentSlotId, string>>
): GenuineEvidenceCoverage {
  const t = norm(joinedEvidence(evidence));
  const facts = extractAcceptedEvidenceFacts(evidence);
  const candidates = scoreMechanismCandidates(evidence, facts);
  const hasSupportedOrStrong =
    candidates.some((c) => c.status === "supported") ||
    candidates.some(
      (c) => c.status === "unresolved" && c.supportingEvidence.length >= 1
    ) ||
    Boolean(evidence.what_goes_wrong?.trim()) ||
    Boolean(evidence.behavior_to_change?.trim());

  // Aspiration alone (e.g. "get better at small talk") is NOT bottleneck evidence.
  const bottleneckOk =
    hasSupportedOrStrong &&
    !isAspirationOnly(evidence) &&
    (hasMechanismSignal(t) ||
      Boolean(evidence.what_goes_wrong) ||
      Boolean(evidence.behavior_to_change) ||
      candidates.some((c) => c.status === "supported"));

  const context =
    hasContext(t) ||
    Boolean(evidence.where_it_shows_up && hasContext(norm(evidence.where_it_shows_up)));
  const pattern =
    hasMechanismSignal(t) ||
    Boolean(evidence.what_goes_wrong) ||
    Boolean(evidence.behavior_to_change) ||
    candidates.some((c) => c.supportingEvidence.length > 0);
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
        !isInteractionSignalOnly(evidence.recent_missed_conversation) &&
        evidence.recent_missed_conversation.trim().length >= 20 &&
        (hasExample(norm(evidence.recent_missed_conversation)) ||
          hasContext(norm(evidence.recent_missed_conversation)))
    );

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

/** Build diagnosis from USER evidence only. Never reads synthesized slots. */
export function synthesizeDiagnosis(
  evidence: Partial<Record<AssessmentSlotId, string>>
): AssessmentDiagnosis {
  const cleaned: Partial<Record<AssessmentSlotId, string>> = {};
  for (const [k, v] of Object.entries(evidence) as [AssessmentSlotId, string][]) {
    if (v && !isInteractionSignalOnly(v)) cleaned[k] = v;
  }

  const t = norm(joinedEvidence(cleaned));
  const facts = extractAcceptedEvidenceFacts(cleaned);
  const competingMechanisms = scoreMechanismCandidates(cleaned, facts);
  const { mechanismId, uncertainty, competing } = selectPrimaryMechanism(
    competingMechanisms
  );
  const coverage = assessGenuineEvidenceCoverage(cleaned);

  let confidence = 0.2;
  if (coverage.bottleneck) confidence += 0.15;
  if (coverage.context) confidence += 0.1;
  if (coverage.pattern) confidence += 0.1;
  if (coverage.example) confidence += 0.15;
  if (coverage.outcome) confidence += 0.1;
  if (coverage.practice) confidence += 0.1;
  if (mechanismId) confidence += 0.1;
  if (uncertainty) confidence = Math.min(confidence, 0.55);
  confidence = Math.min(0.95, confidence);

  const contexts = inferContext(t, cleaned);
  const rootPattern = inferPatternFromCandidates(
    mechanismId,
    uncertainty,
    cleaned,
    t
  );
  const focusArea = inferFocusArea(mechanismId, uncertainty, cleaned, contexts);
  const evidenceLine = inferEvidenceLine(cleaned, t);
  const desiredOutcome = inferOutcome(cleaned, mechanismId);
  const practiceCommitment = inferPractice(cleaned);
  const trainingImplications = buildTrainingImplications(
    mechanismId,
    cleaned,
    contexts,
    uncertainty
  );

  // Aspiration-only small talk must never become the diagnosis claim.
  let primaryBottleneck = focusArea;
  if (
    /\b^small talk$\b/i.test(primaryBottleneck.trim()) ||
    (isAspirationOnly(cleaned) && !mechanismId)
  ) {
    primaryBottleneck =
      "Unscripted conversation — mechanism still being clarified";
  }

  const supportingPatterns = [rootPattern];
  if (
    /\b(boss|manager|authority)\b/.test(t) &&
    mechanismId === "freeze_under_pressure"
  ) {
    supportingPatterns.push(
      "Status pressure appears to worsen retrieval and composure."
    );
  }

  return {
    primaryBottleneck,
    supportingPatterns,
    contexts: contexts || "Everyday conversation",
    evidence: evidenceLine,
    desiredOutcome,
    practiceCommitment,
    confidence,
    mechanismId,
    focusArea: primaryBottleneck,
    keyEnvironments: contexts || "Everyday conversation",
    rootPattern,
    dailyCommitment: practiceCommitment,
    trainingImplications,
    uncertainty,
    competingMechanisms: competing,
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

  setIfEmpty("skill_to_improve", diagnosis.focusArea || diagnosis.primaryBottleneck);
  setIfEmpty("where_it_shows_up", diagnosis.keyEnvironments || diagnosis.contexts);
  setIfEmpty("what_goes_wrong", diagnosis.rootPattern || diagnosis.supportingPatterns[0] || "");
  setIfEmpty(
    "behavior_to_change",
    diagnosis.trainingImplications[0]?.statement ||
      diagnosis.supportingPatterns[1] ||
      diagnosis.rootPattern ||
      diagnosis.primaryBottleneck
  );
  setIfEmpty("recent_missed_conversation", diagnosis.evidence);
  setIfEmpty("six_week_success", diagnosis.desiredOutcome);
  setIfEmpty("practice_time", diagnosis.dailyCommitment || diagnosis.practiceCommitment);

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
  const focus = diagnosis.focusArea || diagnosis.primaryBottleneck;
  const challenges = [
    diagnosis.keyEnvironments || diagnosis.contexts,
    diagnosis.rootPattern || diagnosis.supportingPatterns[0],
  ].filter((x): x is string => Boolean(x && x.trim()));

  // Never surface interaction-signal residue or aspiration-only "small talk".
  const filtered = challenges.filter(
    (c) =>
      !isInteractionSignalOnly(c) &&
      !/^small talk$/i.test(c.trim())
  );

  return {
    goals: [focus],
    challenges: filtered,
    purposeStatement: diagnosis.desiredOutcome || null,
    provenanceClaim: diagnosis.dailyCommitment || diagnosis.practiceCommitment
      ? `Diagnostic integrity assessment (confidence ${diagnosis.confidence.toFixed(2)}). Practice: ${diagnosis.dailyCommitment || diagnosis.practiceCommitment}`
      : `Diagnostic integrity assessment (confidence ${diagnosis.confidence.toFixed(2)}).`,
  };
}
