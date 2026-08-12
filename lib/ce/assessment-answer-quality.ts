/**
 * Assessment Coach V2 — temporary answer-quality reasoning for acceptAnswer.
 *
 * Pure classification only. Not persisted product state.
 * App still owns acceptance / currentSlot; this raises the bar so vague
 * answers do not fill a slot and advance the interview.
 */

/** Keep aligned with AssessmentSlotId in assessment-lifecycle.ts (no cycle). */
export type AssessmentQualitySlotId =
  | "skill_to_improve"
  | "where_it_shows_up"
  | "what_goes_wrong"
  | "behavior_to_change"
  | "recent_missed_conversation"
  | "six_week_success"
  | "practice_time";

export type AssessmentAnswerQuality =
  | "useful"
  | "vague"
  | "ambiguous"
  | "concrete"
  | "off_topic";

const CONTEXT_MARKERS =
  /\b(work|office|job|meeting|meetings|standup|stand-up|presentation|presentations|client|clients|manager|boss|coworker|co-worker|colleague|team|leadership|interview|date|dating|partner|spouse|family|friend|friends|classroom|school|phone|call|zoom|slack|email|home|church|party|networking)\b/i;

const FAILURE_MARKERS =
  /\b(ramble|rambling|freeze|freezing|blank|blurt|trail off|lose|lost|muddle|muddled|circle|circles|over.?explain|long.?winded|interrupt|filler|um+|uh+|stutter|rush|rushed|panic|trip over|can't get|cannot get|don't know what to say|go blank|train of thought|words (won't|dont|don't) come)\b/i;

const BEHAVIOR_MARKERS =
  /\b(i (start|stop|keep|try to|tend to|usually|always|never)|talk too|say too|over.?explain|look down|speak faster|speed up|apologize|trail off|change the subject|avoid|shut down|go quiet)\b/i;

const EVENT_MARKERS =
  /\b(yesterday|today|last (week|night|monday|tuesday|wednesday|thursday|friday|weekend|month)|this morning|earlier|recently|my (manager|boss|coworker|colleague|client|friend|partner|mom|dad|wife|husband)|they asked|she asked|he asked)\b/i;

const TIME_MARKERS =
  /\b(\d+\s*(min|mins|minute|minutes|hour|hours)|half an hour|a few minutes|every day|each day|daily|per day|once a (day|week)|twice|weekdays)\b/i;

const VAGUE_GOAL =
  /\b(communicate better|communication in general|better (at )?communication|be a better communicator|get better at (speaking|talking|communication)|speak better|talk better|be clearer|more confident|confidence|everything|in general|not sure|i don'?t know)\b/i;

const PROFESSIONAL_JARGON_QUESTION =
  /\b(executive presence|audience calibration|communication style|status signals|active listening|cognitive organization|primary communication deficiency|dimensions of your communication)\b/i;

/** Normalize for classification. */
function norm(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function wordCount(text: string): number {
  const t = text.trim();
  if (!t) return 0;
  return t.split(/\s+/).length;
}

function looksOffTopic(t: string): boolean {
  if (
    /\b(weather|football|recipe|crypto|bitcoin|stock market|homework math)\b/.test(
      t
    )
  ) {
    // Still on-topic if it also carries communication signal.
    if (
      CONTEXT_MARKERS.test(t) ||
      FAILURE_MARKERS.test(t) ||
      BEHAVIOR_MARKERS.test(t) ||
      /\b(speak|speaking|talk|conversation|meeting|communicate)\b/.test(t)
    ) {
      return false;
    }
    return true;
  }
  return false;
}

function looksVagueGeneric(t: string): boolean {
  if (VAGUE_GOAL.test(t) && wordCount(t) <= 10 && !FAILURE_MARKERS.test(t)) {
    return true;
  }
  if (
    /^(communication|speaking|talking|conversations?)(,)? (in general|overall)?\.?$/.test(
      t
    )
  ) {
    return true;
  }
  if (
    /^(i want to |i'?d like to )?(get )?better(\s+at (it|this|that))?\.?$/.test(
      t
    )
  ) {
    return true;
  }
  if (/^(everywhere|anywhere|all the time|always|sometimes|it depends)\.?$/.test(t)) {
    return true;
  }
  if (/^(not sure|i don'?t know|no idea|whatever|stuff|things)\b/.test(t)) {
    return true;
  }
  return false;
}

function looksAmbiguous(t: string): boolean {
  // Multiple materially different failure modes with no preference.
  const freeze = /\b(freeze|blank|lose (my )?words|train of thought)\b/.test(t);
  const ramble = /\b(ramble|over.?explain|go on (and on|too long)|circles)\b/.test(
    t
  );
  if (
    freeze &&
    ramble &&
    /\b(or|and|sometimes|either|depends)\b/.test(t) &&
    wordCount(t) <= 18
  ) {
    return true;
  }
  if (
    /\bit depends\b/.test(t) &&
    !CONTEXT_MARKERS.test(t) &&
    !FAILURE_MARKERS.test(t)
  ) {
    return true;
  }
  return false;
}

function looksConcrete(t: string): boolean {
  return EVENT_MARKERS.test(t) && (FAILURE_MARKERS.test(t) || BEHAVIOR_MARKERS.test(t) || CONTEXT_MARKERS.test(t));
}

function hasSlotSignal(slotId: AssessmentQualitySlotId, t: string): boolean {
  switch (slotId) {
    case "skill_to_improve":
      return (
        FAILURE_MARKERS.test(t) ||
        /\b(clear|concise|calm|point|structure|small talk|present|explain|listen|assert|direct|story|storytelling|persuad|negotiat)\b/.test(
          t
        )
      );
    case "where_it_shows_up":
      return CONTEXT_MARKERS.test(t);
    case "what_goes_wrong":
      return FAILURE_MARKERS.test(t) || BEHAVIOR_MARKERS.test(t);
    case "behavior_to_change":
      return (
        BEHAVIOR_MARKERS.test(t) ||
        FAILURE_MARKERS.test(t) ||
        /\b(stop|start|instead|differently|slow down|get to the point|pause|breathe|prepare)\b/.test(
          t
        )
      );
    case "recent_missed_conversation":
      return (
        EVENT_MARKERS.test(t) ||
        (CONTEXT_MARKERS.test(t) && (FAILURE_MARKERS.test(t) || wordCount(t) >= 10))
      );
    case "six_week_success":
      return (
        /\b(able to|want to be able|comfortably|without|clearer|calmer|confidently|get to the point|hold my own)\b/.test(
          t
        ) || wordCount(t) >= 10
      );
    case "practice_time":
      return TIME_MARKERS.test(t);
    default:
      return false;
  }
}

/**
 * Classify a user answer for the app-named slot destination.
 * Conversational reasoning only — not persisted.
 */
export function classifyAssessmentAnswer(
  slotId: AssessmentQualitySlotId,
  text: string
): AssessmentAnswerQuality {
  const t = norm(text);
  if (!t) return "vague";
  if (looksOffTopic(t)) return "off_topic";
  if (looksVagueGeneric(t) && !hasSlotSignal(slotId, t) && !looksConcrete(t)) {
    return "vague";
  }
  if (looksAmbiguous(t) && !looksConcrete(t)) return "ambiguous";
  if (looksConcrete(t)) return "concrete";

  if (hasSlotSignal(slotId, t)) {
    // Short but on-signal is useful enough to accept.
    if (wordCount(t) >= 4) return "useful";
  }

  // Longer answers that are not vague templates — accept as useful.
  if (wordCount(t) >= 8 && !looksVagueGeneric(t)) return "useful";

  // Slot-specific thin answers.
  if (slotId === "practice_time" && TIME_MARKERS.test(t)) return "useful";

  if (looksVagueGeneric(t)) return "vague";
  if (wordCount(t) < 6) return "vague";
  return "ambiguous";
}

/** Acceptable for filling the current slot (advances interview). */
export function isAssessmentAnswerSufficient(
  slotId: AssessmentQualitySlotId,
  text: string
): boolean {
  const q = classifyAssessmentAnswer(slotId, text);
  return q === "useful" || q === "concrete";
}

/** True when Forge should ask one clarifying follow-up instead of advancing. */
export function needsAssessmentClarification(
  slotId: AssessmentQualitySlotId,
  text: string
): boolean {
  const q = classifyAssessmentAnswer(slotId, text);
  return q === "vague" || q === "ambiguous" || q === "off_topic";
}

/**
 * Light Living Profile polish — rewrite phrasing, never invent facts.
 * Distills first-person / filler into concise coach language.
 */
export function synthesizeProfilePhrase(
  raw: string,
  kind: "goal" | "challenge" | "purpose" = "challenge"
): string {
  let t = raw.trim().replace(/\s+/g, " ");
  if (!t) return t;

  t = t.replace(/^(um+|uh+|like|so|well|basically|i guess|i mean)[, ]+/i, "");
  if (kind === "goal") {
    t = t.replace(
      /^(i want to|i'?d like to|i need to|i'?m trying to|trying to)\s+/i,
      ""
    );
    // Gerund-friendly: "get better at X" stays; capitalize.
  }
  if (kind === "challenge" || kind === "purpose") {
    // Prefer observable third-person coaching tone when clearly first-person habit.
    t = t.replace(/\bI (tend to|usually|always|often)\b/gi, "They $1");
    t = t.replace(/\bI (freeze|ramble|panic|rush|blank)\b/gi, "They $1");
    t = t.replace(/\bI can'?t\b/gi, "They can't");
    t = t.replace(/\bI don'?t\b/gi, "They don't");
  }

  t = t.replace(/\s+/g, " ").trim();
  if (!t) return raw.trim();
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Banned professional jargon in spoken Forge questions (V2). */
export function containsAdvancedCoachJargon(text: string): boolean {
  return PROFESSIONAL_JARGON_QUESTION.test(text);
}
