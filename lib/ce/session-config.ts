import { formatCoachMemoryBlock } from "@/lib/coach/memory";
import {
  BREVITY_SYSTEM_INSTRUCTION,
  FORGE_MENTOR_PHILOSOPHY,
  FORGE_TURN_MAX_OUTPUT_TOKENS,
  LISTEN_FIRST_SYSTEM_INSTRUCTION,
} from "@/lib/coach/philosophy";
import type { CoachPromptContext } from "@/lib/coach/types";
import type { ForgeEvent } from "@/lib/types";
import {
  CONCISE_MODE_INSTRUCTION,
  outputBudgetForTurn,
  type VoiceTurnKind,
} from "@/lib/ce/voice-economics";

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
  conciseMode?: boolean;
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
    "- Listen fully; allow silence; prove you heard them before any suggestion.",
    "- One highest-impact focus at a time; return to practice after each coaching beat.",
    "- Practice ratio: member speaks ~80%. Speak only when words beat another rep.",
    "- Prefer 2–3 short sentences (~15–20 seconds), then yield. Never stop mid-sentence.",
    "- Adapt teaching mode (explain / demonstrate / ask / silence / practice).",
    "- Know when not to coach (vent, clarify, overwhelm).",
    "- Sound like a world-class coach — never a questionnaire or scripted bot.",
  ].join("\n");

  const acousticRule = [
    "ACOUSTIC / TURN RULES:",
    "- Members pause while thinking. A pause is not permission to take over.",
    "- Respond only after their thought is complete — never jump into a mid-explanation.",
    "- Coughs, throat clears, and brief non-words are not turns. Wait for real language.",
    "- Prefer waiting and reflecting over filling silence with coaching.",
  ].join("\n");

  return [
    "You are Forge, the practice mentor inside TalkForge — a communication gym.",
    "Primary role: mentor who understands first. Secondary: brief realistic practice partner when invited.",
    "First principle: Understand before you coach.",
    LISTEN_FIRST_SYSTEM_INSTRUCTION,
    BREVITY_SYSTEM_INSTRUCTION,
    input?.conciseMode ? CONCISE_MODE_INSTRUCTION : "",
    acousticRule,
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
  /** Pro/Founding: semantic hands-free VAD. Free: tighter server VAD for hold-to-talk. */
  handsFree?: boolean;
  conciseMode?: boolean;
  turnKind?: VoiceTurnKind;
}) {
  // Hands-free (gated): semantic_vad; client owns barge-in yield.
  // Hold-to-talk: create_response OFF — mid-hold thinking pauses must NOT
  // spawn Forge. Client calls response.create only when Hold is released.
  const turnDetection = input?.handsFree
    ? {
        type: "semantic_vad" as const,
        create_response: true,
        interrupt_response: false,
        eagerness: "low" as const,
      }
    : {
        type: "server_vad" as const,
        create_response: false,
        interrupt_response: false,
        threshold: 0.65,
        prefix_padding_ms: 300,
        // Longer silence before segmenting — members pause while explaining.
        silence_duration_ms: 1200,
      };

  const maxTokens = outputBudgetForTurn(
    input?.turnKind ?? "normal",
    Boolean(input?.conciseMode)
  );

  return {
    session: {
      type: "realtime" as const,
      model: CE_REALTIME_MODEL,
      instructions: buildSystemInstructions(input),
      max_output_tokens: maxTokens || FORGE_TURN_MAX_OUTPUT_TOKENS,
      audio: {
        input: {
          transcription: {
            model: CE_TRANSCRIBE_MODEL,
            language: "en",
          },
          turn_detection: turnDetection,
        },
        output: {
          voice: CE_REALTIME_VOICE,
        },
      },
    },
  };
}

/** session.update — reinforce transcription + dynamic output budget only. */
export function buildSessionUpdateForTranscription(options?: {
  maxOutputTokens?: number;
}) {
  const maxOutputTokens =
    options?.maxOutputTokens ?? FORGE_TURN_MAX_OUTPUT_TOKENS;
  return {
    type: "session.update" as const,
    session: {
      type: "realtime" as const,
      // Never replace full instructions here — that would drop Living Profile memory.
      max_output_tokens: maxOutputTokens,
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
