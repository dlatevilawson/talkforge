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

  /**
   * Discriminating-evidence confidence for early completion.
   * - low: no real discrimination
   * - provisional: some signal, not enough to close
   * - supported: PATH 1 or PATH 2 met with margin
   */
  diagnosticConfidence: DiagnosticConfidence;
  /** Leading support weight minus next plausible competitor (unique discriminating items). */
  supportMargin: number;
  discriminatingEvidenceCount: number;
};

export type DiagnosticConfidence = "low" | "provisional" | "supported";

export type DiscriminatingEvidenceItem = {
  text: string;
  fingerprint: string;
  mechanisms: AssessmentMechanismId[];
  patternId: string;
  slotId: AssessmentSlotId | "derived";
};

export type GenuineEvidenceCoverage = {
  bottleneck: boolean;
  context: boolean;
  pattern: boolean;
  outcome: boolean;
  practice: boolean;
  example: boolean;
  /** Required A coverage (bottleneck + context + outcome + practice). */
  requiredCoverage: boolean;
  /** PATH 1: concrete example + ≥1 discriminating item. */
  path1: boolean;
  /**
   * PATH 2: ≥2 discriminating observations from ≥2 distinct accepted user turns
   * (multi-signal matches inside one utterance count as one).
   */
  path2: boolean;
  /** Distinct user turns contributing Path-2 discriminating observations. */
  path2ObservationCount: number;
  diagnosticConfidence: DiagnosticConfidence;
  supportMargin: number;
  discriminatingEvidenceCount: number;
  /** True only when required coverage AND (path1|path2) with supported confidence. */
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

const FINGERPRINT_STOP = new Set([
  "the",
  "and",
  "or",
  "but",
  "for",
  "with",
  "that",
  "this",
  "when",
  "what",
  "have",
  "has",
  "had",
  "was",
  "were",
  "are",
  "from",
  "into",
  "just",
  "very",
  "really",
  "like",
  "about",
  "than",
  "then",
  "them",
  "they",
  "their",
  "there",
  "been",
  "being",
  "because",
]);

/** Stable token fingerprint for paraphrase dedupe. */
export function evidenceFingerprint(text: string): string {
  return norm(text)
    .replace(/[^\w\s']/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !FINGERPRINT_STOP.has(w))
    .sort()
    .slice(0, 10)
    .join(" ");
}

function fingerprintsNearDuplicate(a: string, b: string): boolean {
  if (!a || !b) return false;
  if (a === b) return true;
  const as = new Set(a.split(" ").filter(Boolean));
  const bs = new Set(b.split(" ").filter(Boolean));
  if (as.size === 0 || bs.size === 0) return false;
  let overlap = 0;
  for (const x of as) if (bs.has(x)) overlap += 1;
  const union = new Set([...as, ...bs]).size;
  return union > 0 && overlap / union >= 0.55;
}

type DiscriminatorPattern = {
  id: string;
  re: RegExp;
  mechanisms: AssessmentMechanismId[];
};

/** Patterns that discriminate between competing mechanisms (not generic goals). */
const DISCRIMINATOR_PATTERNS: DiscriminatorPattern[] = [
  {
    id: "retrieval_clear_thought",
    re: /\b(know what i (mean|want to say)|idea is clear|thought is clear).{0,60}\b(words|wording|can'?t find|cannot find|disappear|won'?t come|don'?t come)\b|\b(words (disappear|don'?t come|won'?t come|will not come)|can'?t find the words|cannot find the words)\b/,
    mechanisms: ["verbal_retrieval"],
  },
  {
    id: "writing_easier_than_speaking",
    re: /\b(writ(e|ing)|prepare[sd]?|notes|script).{0,50}\b(easier|better|help|fine)|speaking.{0,40}(harder|harder than|more (hard|difficult))/,
    mechanisms: ["verbal_retrieval"],
  },
  {
    id: "idea_generation_overwhelm",
    re: /\b(too many (thoughts|ideas)|don'?t know where to start|pieces competing|all at once|thought itself (hasn'?t|has not) formed|no clear (thought|point) yet)\b/,
    mechanisms: ["thought_organization"],
  },
  {
    id: "pressure_authority_freeze",
    re: /\b((mind )?goes blank|freeze|freezing|blank).{0,50}\b(boss|manager|authority|put on the spot|watched)|(boss|manager|authority).{0,50}\b(blank|freeze|ask)/,
    mechanisms: ["freeze_under_pressure"],
  },
  {
    id: "baseline_ok_with_safe_others",
    re: /\b(with )?(friends|friend|partner|family|someone i know).{0,40}\b(fine|okay|ok|easy|comfortable|usually fine)|(fine|okay|comfortable|easy).{0,40}\b(friends|friend|partner|family)/,
    mechanisms: ["freeze_under_pressure"],
  },
  {
    id: "group_entry_timing",
    re: /\b(topic (has )?moved|miss(ed)? (the )?(opening|turn|pause)|by the time.{0,40}(moved|pause|gone)|pause.{0,30}moved|think of something.{0,40}(too late|moved))\b/,
    mechanisms: ["group_timing_lag"],
  },
  {
    id: "over_explain_fear_detail",
    re: /\b(every detail|afraid.{0,40}(leave|understand|miss|out)|worried (they|people) won'?t understand|start from the beginning|add(ing)? (too much )?context because)\b/,
    mechanisms: ["over_explaining"],
  },
  {
    id: "over_explain_ramble",
    re: /\b(ramble|rambling|over.?explain|too much (detail|background)|can'?t get to the point|bury(ing)? the (point|ask))\b/,
    mechanisms: ["over_explaining"],
  },
  {
    id: "small_talk_initiation_open",
    re: /\b(can'?t find an opening|don'?t know how to (start|join)|opening line|join(ing)? (in|small talk))\b/,
    mechanisms: ["small_talk_initiation"],
  },
];

function isNonDiscriminatingText(text: string): boolean {
  const t = norm(text);
  if (!t || isInteractionSignalOnly(t)) return true;
  if (
    /^(i want to )?(get )?better at small talk\.?$/.test(t) ||
    /^small talk\.?$/.test(t)
  ) {
    return true;
  }
  if (
    /\b(communicate better|speak better|be more confident|be a better communicator)\b/.test(
      t
    ) &&
    !/\b(words|freeze|blank|ramble|thoughts|boss|manager|group|detail)\b/.test(t)
  ) {
    return true;
  }
  // Practice duration alone never discriminates.
  if (
    /^\s*(\d+\s*(min|mins|minute|minutes|hour|hours)|about \d+|ten minutes|fifteen minutes).*$/.test(
      t
    ) &&
    !/\b(words|freeze|blank|thought|boss|group|detail)\b/.test(t)
  ) {
    return true;
  }
  return false;
}

/**
 * Extract unique discriminating observations from USER evidence only.
 * Paraphrases / restatements collapse to one item via fingerprint overlap.
 */
export function extractDiscriminatingEvidence(
  evidence: Partial<Record<AssessmentSlotId, string>>
): DiscriminatingEvidenceItem[] {
  const slotOrder: AssessmentSlotId[] = [
    "skill_to_improve",
    "where_it_shows_up",
    "what_goes_wrong",
    "behavior_to_change",
    "recent_missed_conversation",
    "six_week_success",
  ];
  // practice_time intentionally excluded — never discriminating.

  const raw: DiscriminatingEvidenceItem[] = [];
  for (const slotId of slotOrder) {
    const text = evidence[slotId]?.trim();
    if (!text || isNonDiscriminatingText(text)) continue;
    const t = norm(text);
    for (const pattern of DISCRIMINATOR_PATTERNS) {
      if (!pattern.re.test(t)) continue;
      raw.push({
        text,
        fingerprint: evidenceFingerprint(text),
        mechanisms: [...pattern.mechanisms],
        patternId: pattern.id,
        slotId,
      });
    }
  }

  // Derived writing contrast across joined evidence.
  const joined = norm(joinedEvidence(evidence));
  if (
    /\b(know what i (mean|want to say)|words (don'?t|won'?t) come|can'?t find the words)\b/.test(
      joined
    ) &&
    /\b(writ(e|ing)|prepare[sd]?|notes|script).{0,50}\b(easier|better|help|fine)\b/.test(
      joined
    )
  ) {
    raw.push({
      text: "Writing or preparing first is easier than speaking on the spot",
      fingerprint: evidenceFingerprint(
        "writing preparing easier speaking spot words"
      ),
      mechanisms: ["verbal_retrieval"],
      patternId: "writing_easier_than_speaking",
      slotId: "derived",
    });
  }

  // Dedupe near-paraphrases (count once).
  const unique: DiscriminatingEvidenceItem[] = [];
  for (const item of raw) {
    const dup = unique.find(
      (u) =>
        u.patternId === item.patternId ||
        fingerprintsNearDuplicate(u.fingerprint, item.fingerprint)
    );
    if (dup) {
      // Merge mechanism tags onto existing observation.
      for (const m of item.mechanisms) {
        if (!dup.mechanisms.includes(m)) dup.mechanisms.push(m);
      }
      continue;
    }
    unique.push({ ...item, mechanisms: [...item.mechanisms] });
  }
  return unique;
}

/**
 * Path-2 observations: at most one per distinct accepted user turn (slot).
 * Multiple discriminator matches inside one utterance collapse to one.
 * Cross-turn paraphrases collapse to one. Derived (non-turn) items excluded.
 * Scoring may still use finer-grained extractDiscriminatingEvidence items.
 */
export function path2TurnObservations(
  items: DiscriminatingEvidenceItem[]
): DiscriminatingEvidenceItem[] {
  const bySlot = new Map<string, DiscriminatingEvidenceItem>();
  for (const item of items) {
    if (item.slotId === "derived") continue;
    const existing = bySlot.get(item.slotId);
    if (!existing) {
      bySlot.set(item.slotId, {
        ...item,
        mechanisms: [...item.mechanisms],
      });
      continue;
    }
    for (const m of item.mechanisms) {
      if (!existing.mechanisms.includes(m)) existing.mechanisms.push(m);
    }
  }

  const unique: DiscriminatingEvidenceItem[] = [];
  for (const item of bySlot.values()) {
    const dup = unique.find((u) =>
      fingerprintsNearDuplicate(u.fingerprint, item.fingerprint)
    );
    if (dup) {
      for (const m of item.mechanisms) {
        if (!dup.mechanisms.includes(m)) dup.mechanisms.push(m);
      }
      continue;
    }
    unique.push(item);
  }
  return unique;
}

/** Unique discriminating weight per mechanism (paraphrases already collapsed). */
export function mechanismSupportWeights(
  items: DiscriminatingEvidenceItem[]
): Partial<Record<AssessmentMechanismId, number>> {
  const weights: Partial<Record<AssessmentMechanismId, number>> = {};
  for (const item of items) {
    for (const m of item.mechanisms) {
      weights[m] = (weights[m] ?? 0) + 1;
    }
  }
  return weights;
}

export function supportMarginFromWeights(
  weights: Partial<Record<AssessmentMechanismId, number>>
): {
  leadingId: AssessmentMechanismId | null;
  leadingWeight: number;
  secondWeight: number;
  margin: number;
} {
  const ranked = (Object.entries(weights) as [AssessmentMechanismId, number][])
    .filter(([, w]) => w > 0)
    .sort((a, b) => b[1] - a[1]);
  if (ranked.length === 0) {
    return { leadingId: null, leadingWeight: 0, secondWeight: 0, margin: 0 };
  }
  const leadingWeight = ranked[0][1];
  const secondWeight = ranked[1]?.[1] ?? 0;
  return {
    leadingId: ranked[0][0],
    leadingWeight,
    secondWeight,
    margin: leadingWeight - secondWeight,
  };
}

/**
 * Meaningful outrank: leading has ≥1 more unique discriminating observation
 * than the next plausible mechanism (ties / near-ties stay uncertain).
 */
function meaningfullyOutranks(margin: number, leadingWeight: number): boolean {
  return leadingWeight >= 1 && margin >= 1;
}

/** Score mechanism candidates from accepted evidence (support / refute / unresolved). */
export function scoreMechanismCandidates(
  evidence: Partial<Record<AssessmentSlotId, string>>,
  facts: AcceptedEvidenceFact[]
): MechanismCandidate[] {
  const t = norm(joinedEvidence(evidence));
  const snippets = facts.map((f) => f.text);
  const discriminating = extractDiscriminatingEvidence(evidence);
  const weights = mechanismSupportWeights(discriminating);

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
    const discWeight = weights[id] ?? 0;
    const tested =
      Boolean(testedRe && testedRe.test(t)) ||
      facts.some((f) => f.kind === "contrast" && supportRe.test(norm(f.text))) ||
      discWeight >= 2;

    if (
      supportingEvidence.length === 0 &&
      refutingEvidence.length === 0 &&
      discWeight === 0
    ) {
      return null;
    }

    let status: MechanismEvidenceStatus = "unresolved";
    if (refutingEvidence.length > 0 && supportingEvidence.length === 0 && discWeight === 0) {
      status = "refuted";
    } else if (refutingEvidence.length > 0 && discWeight === 0 && supportingEvidence.length > 0) {
      status = "unresolved";
    } else if (supportingEvidence.length > 0 || discWeight > 0) {
      // One weak keyword hit must NEVER become supported.
      if (tested || discWeight >= 2) {
        status = "supported";
      } else if (discWeight === 1 && testedRe && testedRe.test(t)) {
        status = "supported";
      } else {
        status = "unresolved";
      }
      if (
        id === "small_talk_initiation" &&
        isAspirationOnly(evidence) &&
        discWeight < 2
      ) {
        status = "unresolved";
      }
    }

    return {
      id,
      status,
      supportingEvidence:
        supportingEvidence.length > 0
          ? supportingEvidence
          : discriminating
              .filter((d) => d.mechanisms.includes(id))
              .map((d) => d.text),
      refutingEvidence,
      tested: tested || status === "supported",
    };
  };

  const out: MechanismCandidate[] = [];

  const retrieval = candidate(
    "verbal_retrieval",
    /\b(can'?t find the words|cannot find the words|words (disappear|don'?t|do not|won'?t|will not) come|know what i (mean|want to say)|word.?finding|can'?t get the words|words slow)\b/,
    /\b(no idea what to say|mind (is )?blank of ideas|don'?t have (any )?ideas|thought itself feels scrambled|too many (thoughts|ideas) and no core)\b/,
    /\b(writ(e|ing)|prepare[sd]?|notes|script).{0,40}\b(better|easier|help|fine)|know what i (mean|want).{0,40}words\b/
  );
  if (retrieval) out.push(retrieval);

  const ideaGen = candidate(
    "thought_organization",
    /\b(too many (thoughts|ideas)|jumbled|scrambled|organize|organis|scattered|all at once|don'?t know what i think|idea.?generation|no clear thought|don'?t know where to start)\b/,
    /\b(know what i (mean|want to say)|idea is clear|thought is clear|words (don'?t|won'?t) come)\b/,
    /\b(blank|scrambled|too many thoughts|words).{0,30}\b(or|vs|versus)\b/
  );
  if (ideaGen) out.push(ideaGen);

  const overExplain = candidate(
    "over_explaining",
    /\b(ramble|rambling|over.?explain|too much (detail|background|context)|go on (and on|too long)|can'?t get to the point|bury(ing)? the (point|ask)|every detail|afraid.{0,30}(leave|understand)|start from the beginning)\b/
  );
  if (overExplain) out.push(overExplain);

  const freeze = candidate(
    "freeze_under_pressure",
    /\b(freeze|freezing|go blank|mind goes blank|blank when|shut down|put on the spot)\b/
  );
  if (freeze) out.push(freeze);

  const groupTiming = candidate(
    "group_timing_lag",
    /\b(too late|topic (has )?moved|miss(ed)? (my |the )?(turn|opening|pause)|after(wards)?|group conversation|by the time|timing)\b/
  );
  if (groupTiming) out.push(groupTiming);

  const smallTalk = candidate(
    "small_talk_initiation",
    /\b(small talk|join(ing)? in|start(ing)? (a )?conversation|opening line|hallway|don'?t know how to (start|join))\b/
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

  // Writing-helps contrast → retrieval supported, idea-generation refuted.
  if (
    /\b(writ(e|ing)|prepare[sd]?|notes|script).{0,50}\b(easier|better|help|fine)\b/.test(
      t
    ) &&
    /\b(know what i (mean|want)|words (don'?t|won'?t) come|can'?t find the words)\b/.test(
      t
    )
  ) {
    const ret = out.find((c) => c.id === "verbal_retrieval");
    const idea = out.find((c) => c.id === "thought_organization");
    if (ret) {
      ret.tested = true;
      ret.status = "supported";
    }
    if (idea) {
      idea.status = "refuted";
      idea.refutingEvidence = [
        ...idea.refutingEvidence,
        "Writing/preparing first improves delivery — points to retrieval, not missing ideas",
      ];
    }
  }

  // Authority freeze + fine with friends → pressure supported; bare blank stays unresolved.
  if (
    /\b(boss|manager|authority|put on the spot)\b/.test(t) &&
    /\b(blank|freeze)\b/.test(t) &&
    /\b(friends?|family|partner).{0,40}\b(fine|okay|ok|comfortable|easy)|fine.{0,40}friends?\b/.test(
      t
    )
  ) {
    const fr = out.find((c) => c.id === "freeze_under_pressure");
    if (fr) {
      fr.tested = true;
      fr.status = "supported";
    }
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

  // Bare "mind goes blank" without authority/context contrast → unresolved freeze.
  if (
    freeze &&
    freeze.status === "supported" &&
    !freeze.tested &&
    (weights.freeze_under_pressure ?? 0) < 2 &&
    !/\b(boss|manager|authority|friends?|put on the spot)\b/.test(t)
  ) {
    freeze.status = "unresolved";
    freeze.tested = false;
  }

  // Promote single inherently discriminating observation when it uniquely leads.
  const { leadingId, leadingWeight, secondWeight, margin } =
    supportMarginFromWeights(weights);
  for (const c of out) {
    if (c.status === "refuted") continue;
    const w = weights[c.id] ?? 0;
    if (c.tested || w >= 2) {
      c.status = "supported";
      c.tested = true;
      continue;
    }
    if (
      w >= 1 &&
      c.id === leadingId &&
      meaningfullyOutranks(margin, leadingWeight) &&
      secondWeight === 0
    ) {
      c.status = "supported";
      c.tested = true;
      continue;
    }
    if (w >= 1 || c.supportingEvidence.length > 0) {
      // Keep unresolved unless already tested/supported above.
      if (!c.tested) c.status = "unresolved";
    }
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
  candidates: MechanismCandidate[],
  weights: Partial<Record<AssessmentMechanismId, number>>,
  joinedNorm = ""
): {
  mechanismId: AssessmentMechanismId | null;
  uncertainty: string | null;
  competing: MechanismCandidate[];
  supportMargin: number;
} {
  const { leadingId, leadingWeight, secondWeight, margin } =
    supportMarginFromWeights(weights);
  const supported = candidates.filter((c) => c.status === "supported");
  const unresolved = candidates.filter((c) => c.status === "unresolved");

  if (
    /\b(not sure which|i'?m not sure which|sometimes.{0,60}sometimes)\b/.test(
      joinedNorm
    )
  ) {
    return {
      mechanismId: null,
      uncertainty:
        "Evidence does not yet distinguish competing mechanisms (e.g. retrieval vs idea-generation); ask one discriminating question before diagnosing.",
      competing: candidates,
      supportMargin: margin,
    };
  }

  // Ties / near-ties: preserve uncertainty — do not invent a single root.
  if (leadingId && secondWeight > 0 && margin < 1) {
    return {
      mechanismId: null,
      uncertainty: `Competing mechanisms remain plausible (${[
        leadingId,
        ...Object.keys(weights).filter((k) => k !== leadingId && (weights[k as AssessmentMechanismId] ?? 0) > 0),
      ].join(", ")}); not distinguished yet.`,
      competing: candidates,
      supportMargin: margin,
    };
  }

  if (supported.length === 1 && meaningfullyOutranks(margin, leadingWeight)) {
    return {
      mechanismId: supported[0].id,
      uncertainty: null,
      competing: candidates,
      supportMargin: margin,
    };
  }

  if (supported.length === 1 && supported[0].tested && leadingId === supported[0].id) {
    // Tested contrast can support even with margin 0 if competitor was refuted.
    const rivals = candidates.filter(
      (c) => c.id !== supported[0].id && c.status !== "refuted"
    );
    if (rivals.every((r) => r.status !== "supported")) {
      return {
        mechanismId: supported[0].id,
        uncertainty: null,
        competing: candidates,
        supportMargin: Math.max(margin, 1),
      };
    }
  }

  if (supported.length > 1) {
    const tested = supported.filter((c) => c.tested);
    if (tested.length === 1 && meaningfullyOutranks(margin, leadingWeight)) {
      return {
        mechanismId: tested[0].id,
        uncertainty: null,
        competing: candidates,
        supportMargin: margin,
      };
    }
    return {
      mechanismId: null,
      uncertainty: `Competing mechanisms remain plausible (${supported
        .map((c) => c.id)
        .join(", ")}); not distinguished yet.`,
      competing: candidates,
      supportMargin: margin,
    };
  }

  const ret = unresolved.find((c) => c.id === "verbal_retrieval");
  const idea = unresolved.find((c) => c.id === "thought_organization");
  if (ret && idea) {
    return {
      mechanismId: null,
      uncertainty:
        "Evidence does not yet distinguish word retrieval from idea-generation difficulty.",
      competing: candidates,
      supportMargin: margin,
    };
  }

  if (
    leadingId &&
    meaningfullyOutranks(margin, leadingWeight) &&
    leadingWeight >= 2
  ) {
    return {
      mechanismId: leadingId,
      uncertainty: null,
      competing: candidates,
      supportMargin: margin,
    };
  }

  if (unresolved.length >= 1) {
    return {
      mechanismId: null,
      uncertainty: `Mechanism still uncertain (${unresolved
        .map((c) => c.id)
        .join(", ")}). Ask one discriminating question before diagnosing.`,
      competing: candidates,
      supportMargin: margin,
    };
  }

  return {
    mechanismId: null,
    uncertainty:
      "Insufficient accepted evidence to name a root mechanism yet.",
    competing: candidates,
    supportMargin: margin,
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

/** Genuine evidence coverage from USER answers only — discriminating gate. */
export function assessGenuineEvidenceCoverage(
  evidence: Partial<Record<AssessmentSlotId, string>>
): GenuineEvidenceCoverage {
  const t = norm(joinedEvidence(evidence));
  const facts = extractAcceptedEvidenceFacts(evidence);
  const discriminating = extractDiscriminatingEvidence(evidence);
  const weights = mechanismSupportWeights(discriminating);
  const { leadingId, leadingWeight, secondWeight, margin } =
    supportMarginFromWeights(weights);
  const candidates = scoreMechanismCandidates(evidence, facts);
  const { mechanismId, uncertainty } = selectPrimaryMechanism(
    candidates,
    weights,
    t
  );

  const hasSupportedOrStrong =
    candidates.some((c) => c.status === "supported") ||
    discriminating.length > 0 ||
    Boolean(evidence.what_goes_wrong?.trim()) ||
    Boolean(evidence.behavior_to_change?.trim());

  const bottleneckOk =
    hasSupportedOrStrong &&
    !isAspirationOnly(evidence) &&
    (hasMechanismSignal(t) ||
      Boolean(evidence.what_goes_wrong) ||
      Boolean(evidence.behavior_to_change) ||
      discriminating.length > 0);

  const context =
    hasContext(t) ||
    Boolean(evidence.where_it_shows_up && hasContext(norm(evidence.where_it_shows_up)));
  const pattern =
    hasMechanismSignal(t) ||
    Boolean(evidence.what_goes_wrong) ||
    Boolean(evidence.behavior_to_change) ||
    discriminating.length > 0;
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

  // Required coverage A — no example waiver here.
  const requiredCoverage = bottleneckOk && context && outcome && practice;

  const leadingOutranks = meaningfullyOutranks(margin, leadingWeight);
  const leadingMechanismOk = Boolean(
    mechanismId && leadingId && mechanismId === leadingId && leadingOutranks
  );

  // PATH 1 — concrete lived example + ≥1 discriminating item + leading mechanism.
  const path1 =
    example &&
    discriminating.length >= 1 &&
    leadingMechanismOk &&
    !uncertainty;

  // PATH 2 — no recalled example: ≥2 discriminating observations from
  // ≥2 distinct accepted user turns (one utterance = at most one observation),
  // same leading mechanism, meaningful margin over next plausible mechanism.
  const path2Observations = path2TurnObservations(discriminating);
  const path2 =
    !example &&
    path2Observations.length >= 2 &&
    leadingMechanismOk &&
    leadingWeight >= 2 &&
    margin >= 1 &&
    !uncertainty;

  let diagnosticConfidence: DiagnosticConfidence = "low";
  if (path1 || path2) {
    diagnosticConfidence = "supported";
  } else if (discriminating.length >= 1 || candidates.some((c) => c.status !== "refuted" && (weights[c.id] ?? 0) > 0)) {
    diagnosticConfidence = "provisional";
  }

  const sufficient =
    requiredCoverage &&
    (path1 || path2) &&
    diagnosticConfidence === "supported" &&
    mechanismId != null;

  return {
    bottleneck: bottleneckOk,
    context,
    pattern,
    outcome,
    practice,
    example,
    requiredCoverage,
    path1,
    path2,
    path2ObservationCount: path2Observations.length,
    diagnosticConfidence,
    supportMargin: margin,
    discriminatingEvidenceCount: discriminating.length,
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
  const discriminating = extractDiscriminatingEvidence(cleaned);
  const weights = mechanismSupportWeights(discriminating);
  const competingMechanisms = scoreMechanismCandidates(cleaned, facts);
  const { mechanismId, uncertainty, competing, supportMargin } =
    selectPrimaryMechanism(competingMechanisms, weights, t);
  const coverage = assessGenuineEvidenceCoverage(cleaned);

  let confidence = 0.15;
  if (coverage.bottleneck) confidence += 0.1;
  if (coverage.context) confidence += 0.1;
  if (coverage.outcome) confidence += 0.1;
  if (coverage.practice) confidence += 0.05;
  if (coverage.example) confidence += 0.1;
  confidence += Math.min(0.3, discriminating.length * 0.12);
  confidence += Math.min(0.15, supportMargin * 0.1);
  if (mechanismId && coverage.diagnosticConfidence === "supported") {
    confidence += 0.15;
  }
  if (uncertainty || coverage.diagnosticConfidence !== "supported") {
    confidence = Math.min(confidence, 0.55);
  }
  // Synthesized fields never exist in `cleaned` — confidence cannot rise from them.
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
  const trainingImplications =
    coverage.diagnosticConfidence === "supported" && mechanismId
      ? buildTrainingImplications(mechanismId, cleaned, contexts, null)
      : buildTrainingImplications(mechanismId, cleaned, contexts, uncertainty);

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
    trainingImplications:
      coverage.diagnosticConfidence === "supported"
        ? trainingImplications
        : uncertainty
          ? buildTrainingImplications(null, cleaned, contexts, uncertainty)
          : trainingImplications,
    uncertainty:
      coverage.diagnosticConfidence === "supported" ? null : uncertainty,
    competingMechanisms: competing,
    diagnosticConfidence: coverage.diagnosticConfidence,
    supportMargin,
    discriminatingEvidenceCount: discriminating.length,
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
  if (coverage.diagnosticConfidence !== "supported") return false;
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
