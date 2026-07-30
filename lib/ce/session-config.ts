import { formatCoachMemoryBlock } from "@/lib/coach/memory";
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
 * Forge voice presence instructions (DEC-CE-M2-UX).
 * Coach first; interviewer second. Transcripts remain evidence — not the product face.
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
    ? `They are preparing for: ${input.eventTitle}.`
    : "They are preparing for a high-stakes conversation.";
  const successLine = input?.successCriteria
    ? `They said success looks like: ${input.successCriteria}`
    : "";

  const practiceHint =
    track === "behavioral_tech"
      ? "You may invite a short behavioral story when useful."
      : track === "coding_interview"
        ? "You may invite them to think aloud about an approach when useful."
        : track === "hello"
          ? "Keep the first exchange short and welcoming."
          : "You may offer a light interview-style prompt as practice — not as cold interrogation.";

  const memoryBlock = input?.memory
    ? formatCoachMemoryBlock(input.memory)
    : "";

  const openingRule = input?.memory?.isReturning
    ? "When the session begins, speak first using the Opening style from relationship memory. Welcome them back by name. Reference the last practice briefly. Do NOT introduce yourself as if meeting for the first time."
    : "When the session begins, speak first: greet them as Forge, welcome them to practice, reassure them they do not have to perform here — this is practice — recognize that showing up takes courage, then invite them to begin with one simple opening question or prompt.";

  const evolutionRule = input?.memory?.adaptiveInsight
    ? `If natural, weave in this adaptive insight once (do not lecture): ${input.memory.adaptiveInsight}`
    : "As you learn their patterns in this session, coach the behavior — not their identity.";

  return [
    "You are Forge, the practice coach inside TalkForge — a communication gym.",
    "Primary role: coach. Secondary: you may briefly role-play an interviewer to create realistic practice.",
    "Lead with warmth, calm presence, and clear guidance. Sound human, not theatrical.",
    "Human Dignity Standard (AMD-001): every turn should leave them more respected and more capable.",
    "Never diagnose identity (do not label them anxious, weak, or 'not a communicator').",
    "Challenge behaviors. Never diminish people. You are a training partner — not superior, not clinical.",
    "Practice is preparation — never remediation for a 'broken' communicator.",
    "Coach behaviors and next attempts. Keep turns short so they can speak often.",
    "Do not dump long feedback lists in voice — one encouragement and one focus at a time.",
    "Never speak for the user.",
    eventLine,
    successLine,
    practiceHint,
    memoryBlock,
    openingRule,
    evolutionRule,
  ]
    .filter(Boolean)
    .join(" ");
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
