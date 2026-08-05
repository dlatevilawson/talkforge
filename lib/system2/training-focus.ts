/**
 * Machines catalog — discovery + optional Living Profile focus (IV-UX-009 / IV-UX-010).
 * Member-declared purpose/season only when the member chooses. Not Continuity Home.
 */

export type MachineAccent =
  | "steel"
  | "amber"
  | "gold"
  | "mineral"
  | "brass"
  | "ceramic"
  | "crimson";

export type MachineCategory =
  | "Presence"
  | "Clarity"
  | "Courage"
  | "Connection";

export type MachineDifficulty = "Foundations" | "Intermediate" | "Advanced";

export type TrainingFocusOption = {
  id: string;
  number: string;
  title: string;
  /** Short line shown on the card */
  blurb: string;
  /** Longer preview for Discover / Machine detail */
  preview: string;
  /** Example situations the Machine trains */
  examples: string[];
  category: MachineCategory;
  difficulty: MachineDifficulty;
  /** Member-declared purposeStatement written to Living Profile */
  purposeStatement: string;
  /** Primary season label written with the pick */
  seasonLabel: string;
  accent: MachineAccent;
};

export const TRAINING_FOCUS_OPTIONS: TrainingFocusOption[] = [
  {
    id: "interruption",
    number: "01",
    title: "Interruption Machine",
    blurb: "Recover after being interrupted.",
    preview:
      "Practice holding your line when someone cuts in — then return to your point with calm authority.",
    examples: [
      "A meeting where colleagues talk over you",
      "Finishing a pitch after a sudden question",
      "Reclaiming the floor without sounding defensive",
    ],
    category: "Presence",
    difficulty: "Intermediate",
    purposeStatement:
      "Recover cleanly after being interrupted and finish my thought.",
    seasonLabel: "Interruption recovery",
    accent: "steel",
  },
  {
    id: "boundary",
    number: "02",
    title: "Boundary Machine",
    blurb: "Practice saying no with confidence.",
    preview:
      "Learn to decline clearly and kindly — without over-explaining or collapsing under pressure.",
    examples: [
      "Turning down extra work when you’re at capacity",
      "Protecting personal time with a colleague",
      "Saying no to a client request you can’t meet",
    ],
    category: "Courage",
    difficulty: "Foundations",
    purposeStatement:
      "Say no with calm confidence and keep the relationship intact.",
    seasonLabel: "Boundaries under pressure",
    accent: "amber",
  },
  {
    id: "executive",
    number: "03",
    title: "Executive Machine",
    blurb: "Deliver concise, high-impact updates.",
    preview:
      "Train brief, high-signal updates for leaders who have minutes — not hours — for your story.",
    examples: [
      "A 60-second status to your manager",
      "Board-style clarity under time pressure",
      "Leading with the ask, then the why",
    ],
    category: "Clarity",
    difficulty: "Intermediate",
    purposeStatement:
      "Deliver concise, high-impact updates under executive pressure.",
    seasonLabel: "Executive clarity",
    accent: "gold",
  },
  {
    id: "empathy",
    number: "04",
    title: "Empathy Machine",
    blurb: "Navigate emotional conversations.",
    preview:
      "Stay present when emotions rise — listen fully, reflect clearly, and respond without rushing to fix.",
    examples: [
      "A teammate who’s frustrated or hurt",
      "A family conversation that runs hot",
      "Supporting someone without taking over",
    ],
    category: "Connection",
    difficulty: "Foundations",
    purposeStatement: "Stay present and clear in emotional conversations.",
    seasonLabel: "Emotional conversations",
    accent: "mineral",
  },
  {
    id: "negotiation",
    number: "05",
    title: "Negotiation Machine",
    blurb: "Handle objections and close with confidence.",
    preview:
      "Practice curiosity under pushback — surface trade-offs, handle objections, and close without forcing.",
    examples: [
      "Salary or scope negotiation",
      "A client objecting on price",
      "Aligning on a decision with a skeptical peer",
    ],
    category: "Clarity",
    difficulty: "Advanced",
    purposeStatement:
      "Handle objections and close with measured confidence.",
    seasonLabel: "Negotiation",
    accent: "brass",
  },
  {
    id: "phone",
    number: "06",
    title: "Phone Machine",
    blurb: "Build skills for voice-only conversations.",
    preview:
      "Sound clear and composed when there’s no body language to lean on — just your voice and timing.",
    examples: [
      "A high-stakes phone screen",
      "A sensitive call with a client",
      "Leaving a confident voicemail",
    ],
    category: "Presence",
    difficulty: "Foundations",
    purposeStatement:
      "Sound clear and composed on voice-only conversations.",
    seasonLabel: "Voice-only presence",
    accent: "ceramic",
  },
  {
    id: "conflict",
    number: "07",
    title: "Conflict Machine",
    blurb: "Stay calm, think clearly, and lead under pressure.",
    preview:
      "Train composure when tension rises — name the issue, stay respectful, and lead toward resolution.",
    examples: [
      "A heated disagreement in a meeting",
      "Addressing broken trust with a peer",
      "De-escalating without abandoning your point",
    ],
    category: "Courage",
    difficulty: "Advanced",
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
