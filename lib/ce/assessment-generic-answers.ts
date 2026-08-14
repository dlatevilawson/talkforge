/**
 * First-user assessment — reject answers that look fillable by length but
 * carry no useful diagnostic detail. Clarification path, not profile evidence.
 */

export type AssessmentGenericSlotId =
  | "skill_to_improve"
  | "where_it_shows_up"
  | "what_goes_wrong"
  | "behavior_to_change"
  | "recent_missed_conversation"
  | "six_week_success"
  | "practice_time";

function norm(text: string): string {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u2018\u2019\u201b\u2032]/g, "'")
    .replace(/[^\w\s']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const SPECIFIC_SKILL =
  /\b(small talk|articulat|ramble|rambling|freeze|freezing|present|presentation|meeting|meetings|concise|clear|clarity|point|story|storytelling|interview|negotiate|assert|listen|get to the point|train of thought|explain|explaining|blank|words disappear|can't find the words|cannot find the words)\b/i;

const CONTEXT_PERSON_OR_PLACE =
  /\b(work|office|job|meeting|meetings|standup|presentation|client|manager|boss|coworker|colleague|team|leadership|interview|date|partner|family|friend|friends|school|zoom|phone|call|home|party|networking|co-worker|stranger|strangers)\b/i;

const REAL_MOMENT =
  /\b(yesterday|today|last (week|night|monday|tuesday|wednesday|thursday|friday|weekend|month)|this morning|earlier|recently|my (manager|boss|coworker|colleague|client|friend|partner)|they asked|she asked|he asked|in (a |the )?(meeting|call|conversation))\b/i;

/** Phrases that must never count alone as diagnostic evidence. */
const UNIVERSAL_VAGUE =
  /\b(i don'?t know|i do not know|i can'?t remember|i cannot remember|can'?t remember|cannot remember|not sure|no idea|communicate better|be a better communicator|speak better|talk better|be more confident|be confident|more confidence|not knowing what to say|don'?t know what to say|do not know what to say|bad at communication|bad at communicating|communication in general|better (at )?communication|get better at small talk|better at small talk)\b/i;

function isMostlyUniversalVague(t: string): boolean {
  if (!UNIVERSAL_VAGUE.test(t)) return false;
  // Allow if the same answer also carries a specific mechanism/context —
  // but bare failed-recall / don't-know phrases stay rejected.
  if (
    /^(i don'?t know|i do not know|i can'?t remember|i cannot remember|not sure|no idea)\b/.test(
      t
    ) &&
    t.split(/\s+/).length <= 8
  ) {
    return true;
  }
  if (SPECIFIC_SKILL.test(t) || CONTEXT_PERSON_OR_PLACE.test(t) || REAL_MOMENT.test(t)) {
    // "get better at small talk" alone still vague even though SPECIFIC_SKILL matches small talk
    if (
      /^(i (just )?want to |i'?d like to )?(get )?better at small talk\.?$/.test(t) ||
      /^small talk\.?$/.test(t)
    ) {
      return true;
    }
    return false;
  }
  return true;
}

/** True when the answer is too generic to fill/advance this slot. */
export function isGenericAssessmentSlotAnswer(
  slotId: AssessmentGenericSlotId,
  text: string
): boolean {
  const t = norm(text);
  if (!t) return true;
  if (isMostlyUniversalVague(t)) return true;

  switch (slotId) {
    case "skill_to_improve": {
      if (
        /^(i (just )?want to |i'?d like to )?(get )?better at small talk\.?$/.test(
          t
        ) ||
        /^small talk\.?$/.test(t)
      ) {
        return true;
      }
      if (SPECIFIC_SKILL.test(t)) return false;
      if (
        /\b(i just want to |i want to |i'?d like to )?(communicate better|be a better communicator|get better at (speaking|talking|communication)|speak better|talk better)\b/.test(
          t
        )
      ) {
        return true;
      }
      if (
        /^(communication|speaking|talking)( in general| overall)?$/.test(t)
      ) {
        return true;
      }
      if (/^not knowing what to say\.?$/.test(t)) return true;
      return false;
    }
    case "where_it_shows_up": {
      if (CONTEXT_PERSON_OR_PLACE.test(t)) return false;
      if (
        /\b(in general|everyday life|every day life|everywhere|all the time|anywhere|day to day|day-to-day)\b/.test(
          t
        )
      ) {
        return true;
      }
      return false;
    }
    case "what_goes_wrong":
    case "behavior_to_change": {
      if (
        SPECIFIC_SKILL.test(t) ||
        /\b(stop|start|instead|slow down|pause|get to the point|over.?explain|ramble|freeze|blank|words|organize|filter)\b/.test(
          t
        )
      ) {
        return false;
      }
      if (
        /\b(communicate better|be a better communicator|speak better|talk better|not knowing what to say|be more confident)\b/.test(
          t
        )
      ) {
        return true;
      }
      return false;
    }
    case "recent_missed_conversation": {
      if (
        /\b(i can'?t remember|i cannot remember|can'?t remember|cannot remember|i don'?t remember|i do not remember)\b/.test(
          t
        ) &&
        !REAL_MOMENT.test(t) &&
        !CONTEXT_PERSON_OR_PLACE.test(t)
      ) {
        return true;
      }
      if (REAL_MOMENT.test(t) || CONTEXT_PERSON_OR_PLACE.test(t)) return false;
      if (
        /\b(couldn'?t get my point across|could not get my point across|didn'?t get my point across|can'?t get my point across|not knowing what to say)\b/.test(
          t
        )
      ) {
        return true;
      }
      if (
        /\b(conversations? (go|went) (badly|wrong)|it (goes|went) badly)\b/.test(
          t
        ) &&
        !REAL_MOMENT.test(t)
      ) {
        return true;
      }
      return false;
    }
    case "six_week_success": {
      if (
        /\b(able to|want to be able|comfortably|without freezing|more clearly|get to the point|hold my own|answer clearly)\b/.test(
          t
        )
      ) {
        return false;
      }
      if (isMostlyUniversalVague(t)) return true;
      return false;
    }
    case "practice_time": {
      return !/\b(\d+\s*(min|mins|minute|minutes|hour|hours)|half an hour|a few minutes|every day|each day|daily|per day)\b/.test(
        t
      );
    }
    default:
      return false;
  }
}
