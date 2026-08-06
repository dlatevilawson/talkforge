/**
 * Training focus options — member-facing copy follows MKT-001 / IV-PROD-007.
 * Internal ids stay stable; titles never say “Machine” or sell technology.
 */

export type TrainingFocusOption = {
  id: string;
  number: string;
  /** Member-facing transformation title (Marketing Brain) */
  title: string;
  /** Short outcome line on the card */
  blurb: string;
  /** Member-declared purposeStatement written to Living Profile */
  purposeStatement: string;
  /** Primary season label written with the pick */
  seasonLabel: string;
  /** Accent token for card halo (CSS var key on the picker) */
  accent: "steel" | "amber" | "gold" | "mineral" | "brass" | "ceramic" | "crimson";
};

export const TRAINING_FOCUS_OPTIONS: TrainingFocusOption[] = [
  {
    id: "interruption",
    number: "01",
    title: "Recover Instantly When Interrupted",
    blurb: "Finish your thought — even when they cut you off.",
    purposeStatement:
      "Recover cleanly after being interrupted and finish my thought.",
    seasonLabel: "Interruption recovery",
    accent: "steel",
  },
  {
    id: "boundary",
    number: "02",
    title: "Practice Saying “No” Without Feeling Guilty",
    blurb: "Hold the line without burning the relationship.",
    purposeStatement:
      "Say no with calm confidence and keep the relationship intact.",
    seasonLabel: "Boundaries under pressure",
    accent: "amber",
  },
  {
    id: "executive",
    number: "03",
    title: "Command the Room in High-Impact Updates",
    blurb: "Sound like the leader people already trust.",
    purposeStatement:
      "Deliver concise, high-impact updates under executive pressure.",
    seasonLabel: "Executive clarity",
    accent: "gold",
  },
  {
    id: "empathy",
    number: "04",
    title: "Handle Emotional Conversations Without Choking",
    blurb: "Stay present when the room gets heavy.",
    purposeStatement: "Stay present and clear in emotional conversations.",
    seasonLabel: "Emotional conversations",
    accent: "mineral",
  },
  {
    id: "negotiation",
    number: "05",
    title: "Get Paid What You’re Actually Worth",
    blurb: "Ask for more — and mean it.",
    purposeStatement:
      "Handle objections and close with measured confidence.",
    seasonLabel: "Negotiation",
    accent: "brass",
  },
  {
    id: "phone",
    number: "06",
    title: "Own the Call When They Can’t See You",
    blurb: "Sound clear and composed with voice alone.",
    purposeStatement:
      "Sound clear and composed on voice-only conversations.",
    seasonLabel: "Voice-only presence",
    accent: "ceramic",
  },
  {
    id: "conflict",
    number: "07",
    title: "Stay Calm and Lead Under Extreme Pressure",
    blurb: "Keep your head when the conversation catches fire.",
    purposeStatement:
      "Stay calm, think clearly, and lead through conflict.",
    seasonLabel: "Conflict under pressure",
    accent: "crimson",
  },
];

export function trainingFocusById(
  id: string | null | undefined
): TrainingFocusOption | null {
  if (!id) return null;
  return TRAINING_FOCUS_OPTIONS.find((option) => option.id === id) ?? null;
}
