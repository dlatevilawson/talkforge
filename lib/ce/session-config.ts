import { formatCoachMemoryBlock } from "@/lib/coach/memory";
import { FORGE_MENTOR_PHILOSOPHY } from "@/lib/coach/philosophy";
import type { CoachPromptContext } from "@/lib/coach/types";
import type { ForgeEvent } from "@/lib/types";

/** OpenAI Realtime model for CE-M1+. */
export const CE_REALTIME_MODEL = "gpt-realtime-2.1";

/** Default voice for Forge presence. */
export const CE_REALTIME_VOICE = "marin";

/** Input transcription model (CE-M2 evidence substrate). */
export const CE_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";

export type CeTrack = ForgeEvent["track"] | "hello";

export const CE_TRACK_TITLES: Record<CeTrack, string> = {
  hello: "Voice practice with Forge",
  system_design: "System design interview practice",
  behavioral_tech: "Behavioral interview practice",
  coding_interview: "Coding interview practice",
};

/**
 * Forge voice presence instructions.
 * Mentor pacing first; interviewer role-play second.
 * Never invent identity labels (FLA-001).
 */
export function buildSystemInstructions(input?: {
  track?: CeTrack;
  eventTitle?: string;
  successCriteria?: string;
  memory?: CoachPromptContext | null;
}): string {
  const track = input?.track ?? "system_design";
  const eventLine = input?.eventTitle
    ? `They may be preparing for: ${input.eventTitle}. Hold that lightly — understand them before shaping practice.`
    : "They may be preparing for a high-stakes conversation. Discover what matters before coaching.";
  const successLine = input?.successCriteria
    ? `They once said success looks like: ${input.successCriteria}. Don't turn that into a checklist unless they bring it up.`
    : "";

  const practiceHint =
    track === "behavioral_tech"
      ? "You may invite a short behavioral story later — only after they feel understood."
      : track === "coding_interview"
        ? "You may invite them to think aloud later — only after rapport."
        : track === "hello"
          ? "Keep the first exchanges short, warm, and curious."
          : "Role-play an interviewer only after they are ready — never open with cold interrogation.";

  const memoryBlock = input?.memory
    ? formatCoachMemoryBlock(input.memory)
    : "";

  const openingRule = input?.memory?.isReturning
    ? "When the session begins, speak first using Opening style from relationship memory. Welcome them back by name. Name at most one pattern or calm memory. Ask one curious question. Do NOT introduce yourself as if meeting for the first time. Do NOT offer a menu of focus areas."
    : "When the session begins, speak first: short warm greeting as Forge, one line that they don't have to perform, one curious question. Then wait.";

  const maturity = input?.memory?.coachingMaturity;
  const maturityRule =
    maturity === "deep"
      ? "Relationship maturity is deep: skip pep talks. Assume continuity. Go one level deeper when they are ready."
      : maturity === "familiar"
        ? "Relationship maturity is familiar: don't re-introduce yourself or restart from zero."
        : "Relationship maturity is new: earn trust gently before coaching.";

  const evolutionRule = input?.memory?.adaptiveInsight
    ? `If it fits naturally later (not in the first breath), you may gently notice: ${input.memory.adaptiveInsight}. Never dump it as a status report.`
    : "As patterns appear in this session, notice them gently — don't lecture.";

  const emotionRule =
    input?.memory?.emotionalNotes?.length
      ? `Emotional notes from prior sessions (handle gently, never diagnose): ${input.memory.emotionalNotes.join("; ")}.`
      : "";

  return [
    "You are Forge, the practice mentor inside TalkForge — a communication gym.",
    "Primary role: mentor who understands first. Secondary: brief realistic practice partner when invited.",
    FORGE_MENTOR_PHILOSOPHY,
    "Human Dignity Standard (AMD-001): every turn should leave them more respected and more capable.",
    "Never diagnose identity (do not label them anxious, weak, or 'not a communicator').",
    "Challenge behaviors only after understanding. Never diminish people.",
    "Practice is preparation — never remediation for a 'broken' communicator.",
    "Never speak for the user.",
    eventLine,
    successLine,
    practiceHint,
    memoryBlock,
    openingRule,
    maturityRule,
    evolutionRule,
    emotionRule,
  ]
    .filter(Boolean)
    .join("\n\n");
}

/** Body for POST /v1/realtime/client_secrets — includes CE-M2 input transcription. */
export function buildClientSecretRequest(input?: {
  track?: CeTrack;
  eventTitle?: string;
  successCriteria?: string;
  memory?: CoachPromptContext | null;
}) {
  return {
    session: {
      type: "realtime" as const,
      model: CE_REALTIME_MODEL,
      instructions: buildSystemInstructions(input),
      audio: {
        input: {
          transcription: {
            model: CE_TRANSCRIBE_MODEL,
            language: "en",
          },
        },
        output: {
          voice: CE_REALTIME_VOICE,
        },
      },
    },
  };
}

/** session.update payload to reinforce transcription after connect. */
export function buildSessionUpdateForTranscription() {
  return {
    type: "session.update" as const,
    session: {
      type: "realtime" as const,
      audio: {
        input: {
          transcription: {
            model: CE_TRANSCRIBE_MODEL,
            language: "en",
          },
        },
      },
    },
  };
}
