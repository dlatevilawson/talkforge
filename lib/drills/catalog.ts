export type DrillSignal =
  | "purpose"
  | "perspective"
  | "composure"
  | "message"
  | "adaptability";

export type DrillModality = "voice" | "text" | "field";

export type DrillPhase = "recognise" | "build" | "rehearse" | "roleplay";

const DRILL_PHASE_LABELS: Record<DrillPhase, string> = {
  recognise: "Recognise",
  build: "Build",
  rehearse: "Rehearse",
  roleplay: "Role-play",
};

export function drillPhaseLabel(phase: DrillPhase | null | undefined): string | null {
  return phase ? DRILL_PHASE_LABELS[phase] : null;
}

export type Drill = {
  id: string;
  slug: string;
  name: string;
  signal: DrillSignal;
  phase: DrillPhase | null;
  instructions: string;
  durationMinutes: number;
  modality: DrillModality;
  difficulty: 1 | 2 | 3;
  twoMinuteVersion: string;
  scenarioTags: string[];
  goodLooksLike: string;
  question: string;
  workedExample: string;
};

// IDs are stable so the home card, URL, and completion record refer to one drill.
// The migration uses the same names and upserts the canonical database rows.
export const STARTER_DRILLS: readonly Drill[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "one-sentence-point",
    name: "One-sentence point",
    signal: "purpose",
    phase: "build",
    instructions:
      "Write the single sentence you would want quoted from this conversation. 12 words or fewer. Then read it aloud once, exactly as written.",
    durationMinutes: 3,
    modality: "text",
    difficulty: 1,
    twoMinuteVersion: "Just write the sentence.",
    scenarioTags: ["general"],
    goodLooksLike: "States the point before any background.",
    question: "What is the one thing you want the listener to remember from this conversation?",
    workedExample: "Point: I want the team to leave with one clear next step.\nExample: After the meeting, everyone should know who owns the first action and when it starts.",
  },
  {
    id: "00000000-0000-0000-0000-000000000007",
    slug: "three-second-rule",
    name: "The 3-second rule",
    signal: "composure",
    phase: "rehearse",
    instructions:
      "Answer 5 coach questions. Wait a full 3 seconds of silence before each answer—count it. Do not fill the silence with “um” or “so.”",
    durationMinutes: 4,
    modality: "voice",
    difficulty: 1,
    twoMinuteVersion: "Answer 3 questions.",
    scenarioTags: ["interview", "conflict"],
    goodLooksLike: "Silence is held without filler; answers start clean.",
    question: "What opening line will you say before holding a full three-second pause?",
    workedExample: "Opening line: “Thanks for making time to talk.” [Hold a full three seconds of silence.] Continue: “I want to make sure we leave with one clear next step.”",
  },
  {
    id: "00000000-0000-0000-0000-000000000010",
    slug: "prep-builder",
    name: "PREP builder",
    signal: "message",
    phase: "build",
    instructions:
      "Write one answer in PREP form: Point, Reason, Example (two lines), Point. Then say it aloud exactly as written.",
    durationMinutes: 4,
    modality: "text",
    difficulty: 1,
    twoMinuteVersion: "Write the four PREP parts.",
    scenarioTags: ["interview", "pitch"],
    goodLooksLike: "A listener could identify the four parts.",
    question: "Why should a founder practice communication every day?",
    workedExample: "Point: A founder who practices speaking every day gets heard. One who doesn't, doesn't.\nReason: Most ideas don't fail because they're bad. They fail because nobody understood them the first time.\nExample: You walk into a meeting with a good idea but no clear sentence for it. / Someone else says it simply, and the room follows them.\nPoint: That's why I practice. So the next time it matters, the words are already there.",
  },
];

export function starterDrillHref(drill: Drill): string {
  return "/app/practice?drill=" + encodeURIComponent(drill.slug) + "&start=0";
}

export function findStarterDrill(idOrSlug: string | null | undefined): Drill | null {
  return STARTER_DRILLS.find((drill) => drill.id === idOrSlug || drill.slug === idOrSlug) ?? null;
}

