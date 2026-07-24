import TrainingArena from "@/app/components/TrainingArena";
import type { ForgeEvent } from "@/lib/types";

const TRACK_COPY: Record<
  ForgeEvent["track"],
  {
    title: string;
    headline: string;
    description: string;
    mission: string;
    missionPrompt: string;
    skill1: string;
    skill2: string;
    skill3: string;
  }
> = {
  system_design: {
    title: "Technical Interview · System Design",
    headline: "Structure Under Pressure.",
    description:
      "Practice clarifying constraints, naming tradeoffs, and staying organized when the interviewer probes.",
    mission:
      'The interviewer says, "Design a URL shortener that can handle 100M users. Start wherever you like."',
    missionPrompt:
      'The interviewer says, "Design a URL shortener that can handle 100M users. Start wherever you like." How do you open?',
    skill1: "Structure",
    skill2: "Tradeoffs",
    skill3: "Composure",
  },
  behavioral_tech: {
    title: "Technical Interview · Behavioral",
    headline: "Own The Story.",
    description:
      "Practice clear impact stories — conflict, ownership, and learning — without identity labels from the coach.",
    mission:
      'The interviewer asks, "Tell me about a time you disagreed with a technical decision and what you did."',
    missionPrompt:
      'The interviewer asks, "Tell me about a time you disagreed with a technical decision and what you did." How do you answer?',
    skill1: "Clarity",
    skill2: "Ownership",
    skill3: "Presence",
  },
  coding_interview: {
    title: "Technical Interview · Coding Communication",
    headline: "Think Out Loud.",
    description:
      "Practice clarifying the problem, stating an approach, and checking understanding as you work.",
    mission:
      'The interviewer pastes a problem and says, "Talk me through how you\'d approach this before you code."',
    missionPrompt:
      'The interviewer says, "Talk me through how you\'d approach this before you code." How do you start?',
    skill1: "Clarify",
    skill2: "Approach",
    skill3: "Check-ins",
  },
};

export default async function InterviewPage({
  searchParams,
}: {
  searchParams: Promise<{
    mission?: string | string[];
    event?: string | string[];
    track?: string | string[];
  }>;
}) {
  const params = await searchParams;
  const trackRaw = Array.isArray(params.track) ? params.track[0] : params.track;
  const track: ForgeEvent["track"] =
    trackRaw === "behavioral_tech" || trackRaw === "coding_interview"
      ? trackRaw
      : "system_design";
  const eventId = Array.isArray(params.event) ? params.event[0] : params.event;
  const copy = TRACK_COPY[track];

  return (
    <TrainingArena
      scenarioId={`technical_interview_${track}`}
      eventId={eventId}
      missionStarted={
        params.mission === "1" ||
        (Array.isArray(params.mission) && params.mission.includes("1"))
      }
      title={copy.title}
      headline={copy.headline}
      description={copy.description}
      mission={copy.mission}
      difficulty="⭐⭐⭐☆☆"
      duration="15 Minutes"
      skill1={copy.skill1}
      skill2={copy.skill2}
      skill3={copy.skill3}
      coachMessage="Forge coaches observed behaviors for this interview — not your identity. Reality will complete the loop after the real conversation."
      missionPrompt={copy.missionPrompt}
      placeholder="Type your response to the interviewer..."
    />
  );
}
