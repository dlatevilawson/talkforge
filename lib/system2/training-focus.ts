/**
 * Optional visual training-focus options (IV-UX-009).
 * Member-declared purpose/season labels only — not a mission-menu home.
 */

export type TrainingFocusOption = {
  id: string;
  number: string;
  title: string;
  /** Short line shown on the card */
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
    title: "Interruption Machine",
    blurb: "Recover after being interrupted.",
    purposeStatement: "Recover cleanly after being interrupted and finish my thought.",
    seasonLabel: "Interruption recovery",
    accent: "steel",
  },
  {
    id: "boundary",
    number: "02",
    title: "Boundary Machine",
    blurb: "Practice saying no with confidence.",
    purposeStatement: "Say no with calm confidence and keep the relationship intact.",
    seasonLabel: "Boundaries under pressure",
    accent: "amber",
  },
  {
    id: "executive",
    number: "03",
    title: "Executive Machine",
    blurb: "Deliver concise, high-impact updates.",
    purposeStatement: "Deliver concise, high-impact updates under executive pressure.",
    seasonLabel: "Executive clarity",
    accent: "gold",
  },
  {
    id: "empathy",
    number: "04",
    title: "Empathy Machine",
    blurb: "Navigate emotional conversations.",
    purposeStatement: "Stay present and clear in emotional conversations.",
    seasonLabel: "Emotional conversations",
    accent: "mineral",
  },
  {
    id: "negotiation",
    number: "05",
    title: "Negotiation Machine",
    blurb: "Handle objections and close with confidence.",
    purposeStatement: "Handle objections and close with measured confidence.",
    seasonLabel: "Negotiation",
    accent: "brass",
  },
  {
    id: "phone",
    number: "06",
    title: "Phone Machine",
    blurb: "Build skills for voice-only conversations.",
    purposeStatement: "Sound clear and composed on voice-only conversations.",
    seasonLabel: "Voice-only presence",
    accent: "ceramic",
  },
  {
    id: "conflict",
    number: "07",
    title: "Conflict Machine",
    blurb: "Stay calm, think clearly, and lead under pressure.",
    purposeStatement: "Stay calm, think clearly, and lead through conflict.",
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
