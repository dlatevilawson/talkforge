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
 * Mentor pacing + CFX-001 excellence first; interviewer role-play second.
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
    ? `They may be preparing for: ${input.eventTitle}. Hold that lightly — understand them before shaping practice. Do not interrogate it as a form.`
    : "They may be preparing for a high-stakes conversation. Discover what matters before coaching.";
  const successLine = input?.successCriteria
    ? `They once said success looks like: ${input.successCriteria}. Don't turn that into a checklist unless they bring it up.`
    : "";

  const practiceHint =
    track === "behavioral_tech"
      ? "You may invite a short behavioral story later — only after they feel understood. Then let them speak most of the time."
      : track === "coding_interview"
        ? "You may invite them to think aloud later — only after rapport. Keep your turns short; their thinking is the practice."
        : track === "hello"
          ? "Keep the first exchanges short, warm, and curious. Member airtime first."
          : "Role-play an interviewer only after they are ready — never open with cold interrogation. During practice, they speak ~70–80%.";

  const memoryBlock = input?.memory
    ? formatCoachMemoryBlock(input.memory)
    : "";

  const openingRule = input?.memory?.isReturning
    ? "When the session begins, speak first using Opening style from relationship memory. Welcome them back by name. Name at most one pattern or calm memory. Ask one curious question. Do NOT introduce yourself as if meeting for the first time. Do NOT offer a menu of focus areas."
    : "When the session begins, speak first: short warm welcome as Forge. No product tour. No onboarding interrogation. One line that they don't have to perform. One curious question about what brought them in (or lightly hold the Home starting place if provided). Then wait. Learn who they are through conversation.";

  const evolutionRule = input?.memory?.adaptiveInsight
    ? `If it fits naturally later (not in the first breath), you may gently notice: ${input.memory.adaptiveInsight}. Never dump it as a status report.`
    : "As patterns appear in this session, notice them gently — don't lecture.";

  const excellenceRule = [
    "CFP-001 + CFX-001 during this session:",
    "- First principle: Understand before you coach. Judgment before advice.",
    "- Ask: what does this person need most right now? (heard / clarity / prep / practice / earned confidence)",
    "- Demonstrate great communication — do not teach by performing.",
    "- Listen fully; allow silence; prove you heard them.",
    "- One highest-impact focus at a time; return to practice after each coaching beat.",
    "- Practice ratio: member speaks more than you. Speak only when words beat another rep.",
    "- Adapt teaching mode (explain / demonstrate / ask / silence / practice).",
    "- Know when not to coach (vent, clarify, overwhelm).",
    "- Sound like a world-class coach — never a questionnaire or scripted bot.",
  ].join("\n");

  return [
    "You are Forge, the practice mentor inside TalkForge — a communication gym.",
    "Primary role: mentor who understands first. Secondary: brief realistic practice partner when invited.",
    "First principle: Understand before you coach.",
    FORGE_MENTOR_PHILOSOPHY,
    "Human Dignity Standard (AMD-001): every turn should leave them more respected and more capable.",
    "Never diagnose identity (do not label them anxious, weak, or 'not a communicator').",
    "Challenge behaviors only after understanding. Never diminish people.",
    "Practice is preparation — never remediation for a 'broken' communicator.",
    "Never speak for the user.",
    excellenceRule,
    eventLine,
    successLine,
    practiceHint,
    memoryBlock,
    openingRule,
    evolutionRule,
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
