export type DrillSignal =
  | "purpose"
  | "perspective"
  | "composure"
  | "message"
  | "adaptability";

export type DrillModality = "voice" | "text" | "field";

export type Drill = {
  id: string;
  slug: string;
  name: string;
  signal: DrillSignal;
  instructions: string;
  durationMinutes: number;
  modality: DrillModality;
  difficulty: 1 | 2 | 3;
  twoMinuteVersion: string;
  scenarioTags: string[];
  goodLooksLike: string;
};

// IDs are stable so the home card, URL, and completion record refer to one drill.
// The migration uses the same names and upserts the canonical database rows.
export const STARTER_DRILLS: readonly Drill[] = [
  {
    id: "00000000-0000-0000-0000-000000000001",
    slug: "one-sentence-point",
    name: "One-sentence point",
    signal: "purpose",
    instructions:
      "Write the single sentence you would want quoted from this conversation. 12 words or fewer. Then read it aloud once, exactly as written.",
    durationMinutes: 3,
    modality: "text",
    difficulty: 1,
    twoMinuteVersion: "Just write the sentence.",
    scenarioTags: ["general"],
    goodLooksLike: "States the point before any background.",
  },
  {
    id: "00000000-0000-0000-0000-000000000007",
    slug: "three-second-rule",
    name: "The 3-second rule",
    signal: "composure",
    instructions:
      "Answer 5 coach questions. Wait a full 3 seconds of silence before each answer—count it. Do not fill the silence with “um” or “so.”",
    durationMinutes: 4,
    modality: "voice",
    difficulty: 1,
    twoMinuteVersion: "Answer 3 questions.",
    scenarioTags: ["interview", "conflict"],
    goodLooksLike: "Silence is held without filler; answers start clean.",
  },
  {
    id: "00000000-0000-0000-0000-000000000010",
    slug: "prep-builder",
    name: "PREP builder",
    signal: "message",
    instructions:
      "Write one answer in PREP form: Point, Reason, Example (two lines), Point. Then say it aloud exactly as written.",
    durationMinutes: 4,
    modality: "text",
    difficulty: 1,
    twoMinuteVersion: "Write the four PREP parts.",
    scenarioTags: ["interview", "pitch"],
    goodLooksLike: "A listener could identify the four parts.",
  },
];

export function starterDrillHref(drill: Drill): string {
  return "/app/practice?drill=" + encodeURIComponent(drill.slug) + "&start=0";
}

export function findStarterDrill(idOrSlug: string | null | undefined): Drill | null {
  return STARTER_DRILLS.find((drill) => drill.id === idOrSlug || drill.slug === idOrSlug) ?? null;
}

