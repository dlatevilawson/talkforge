/**
 * First-user assessment — reject generic-but-long answers that look
 * substantive by length but carry no useful diagnostic detail.
 *
 * Pure helpers for acceptAnswer. Not persisted product state.
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
  /\b(small talk|articulat|ramble|rambling|freeze|freezing|present|presentation|meeting|meetings|concise|clear|clarity|point|story|storytelling|interview|negotiate|assert|listen|confidence when speaking|get to the point|train of thought|explain|explaining)\b/i;

const CONTEXT_PERSON_OR_PLACE =
  /\b(work|office|job|meeting|meetings|standup|presentation|client|manager|boss|coworker|colleague|team|leadership|interview|date|partner|family|friend|friends|school|zoom|phone|call|home|party|networking|coworker|co-worker)\b/i;

const REAL_MOMENT =
  /\b(yesterday|today|last (week|night|monday|tuesday|wednesday|thursday|friday|weekend|month)|this morning|earlier|recently|my (manager|boss|coworker|colleague|client|friend|partner)|they asked|she asked|he asked|in (a |the )?(meeting|call|conversation))\b/i;

/** True when the answer is too generic to fill/advance this slot. */
export function isGenericAssessmentSlotAnswer(
  slotId: AssessmentGenericSlotId,
  text: string
): boolean {
  const t = norm(text);
  if (!t) return true;

  switch (slotId) {
    case "skill_to_improve": {
      // Specific skills (small talk, articulation, etc.) are useful.
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
    case "behavior_to_change": {
      if (SPECIFIC_SKILL.test(t) || /\b(stop|start|instead|slow down|pause|get to the point|over.?explain|ramble|freeze)\b/.test(t)) {
        return false;
      }
      if (
        /\b(communicate better|be a better communicator|speak better|talk better)\b/.test(
          t
        )
      ) {
        return true;
      }
      return false;
    }
    case "recent_missed_conversation": {
      if (REAL_MOMENT.test(t) || CONTEXT_PERSON_OR_PLACE.test(t)) return false;
      if (
        /\b(couldn'?t get my point across|could not get my point across|didn'?t get my point across|can'?t get my point across)\b/.test(
          t
        )
      ) {
        return true;
      }
      // Generic “conversations go badly” with no who/when/where.
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
    default:
      return false;
  }
}
