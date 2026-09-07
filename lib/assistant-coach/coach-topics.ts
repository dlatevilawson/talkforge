export const COACH_TOPICS = [
  {
    id: "interview",
    number: "01",
    label: "Interview",
    title: "Interview",
    blurb: "Answer with clarity when the stakes are high.",
    context: "Prepare for a job interview.",
    accent: "steel",
  },
  {
    id: "salary-negotiation",
    number: "02",
    label: "Salary negotiation",
    title: "Salary negotiation",
    blurb: "Make the ask and hold your ground.",
    context: "Prepare for a salary negotiation.",
    accent: "amber",
  },
  {
    id: "difficult-feedback",
    number: "03",
    label: "Difficult feedback",
    title: "Difficult feedback",
    blurb: "Say what needs to be said without losing trust.",
    context: "Prepare to give difficult feedback.",
    accent: "gold",
  },
  {
    id: "setting-a-boundary",
    number: "04",
    label: "Setting a boundary",
    title: "Setting a boundary",
    blurb: "Be clear, calm, and firm about what you need.",
    context: "Prepare to set a boundary.",
    accent: "mineral",
  },
  {
    id: "pitch-presentation",
    number: "05",
    label: "Pitch / Presentation",
    title: "Pitch / Presentation",
    blurb: "Land the message with confidence and structure.",
    context: "Prepare for a pitch or presentation.",
    accent: "brass",
  },
  {
    id: "handling-conflict",
    number: "06",
    label: "Handling conflict",
    title: "Handling conflict",
    blurb: "Stay composed when the conversation gets tense.",
    context: "Prepare to handle a conflict.",
    accent: "ceramic",
  },
  {
    id: "something-else",
    number: "07",
    label: "Something else",
    title: "Something else",
    blurb: "Prepare for another conversation that matters.",
    context: "Prepare for another high-stakes conversation.",
    accent: "crimson",
  },
] as const;

export type CoachTopic = (typeof COACH_TOPICS)[number];
export type CoachTopicId = CoachTopic["id"];

export function coachTopicById(
  id: string | null | undefined
): CoachTopic | null {
  if (!id) return null;
  return COACH_TOPICS.find((topic) => topic.id === id) ?? null;
}
