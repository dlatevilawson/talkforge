import { formatCoachMemoryBlock } from "@/lib/coach/memory";
import {
  BREVITY_SYSTEM_INSTRUCTION,
  FORGE_TURN_MAX_OUTPUT_TOKENS,
  LISTEN_FIRST_SYSTEM_INSTRUCTION,
  MINIMAL_INTERVENTION_COACHING_RULES,
  buildForgeSystemPrompt,
} from "@/lib/coach/philosophy";
import type { CoachPromptContext } from "@/lib/coach/types";
import type { ForgeEvent } from "@/lib/types";
import {
  CONCISE_MODE_INSTRUCTION,
  outputBudgetForTurn,
  type VoiceTurnKind,
} from "@/lib/ce/voice-economics";
import { resolveRealtimeTurnDetection } from "@/lib/ce/assessment-lifecycle";
import { buildAssessmentSystemInstructions } from "@/lib/ce/assessment-prompt";

/** OpenAI Realtime model for CE-M1+. */
export const CE_REALTIME_MODEL = "gpt-realtime-2.1";

/** Default voice for Forge presence. */
export const CE_REALTIME_VOICE = "marin";

/** Input transcription model (CE-M2 evidence substrate). */
export const CE_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";

export type CeTrack = ForgeEvent["track"] | "hello";

/** Session mode — assessment keeps the coach brain; app observes/persists. */
export type CeSessionMode = "practice" | "assessment";

export const CE_TRACK_TITLES: Record<CeTrack, string> = {
  hello: "Voice practice with Forge",
  system_design: "System design interview practice",
  behavioral_tech: "Behavioral interview practice",
  coding_interview: "Coding interview practice",
};

/**
 * Practice mode objective + capabilities only.
 * Inherits Forge Core — must not redefine identity, limits, or epistemic rules.
 */
export function buildPracticeModeObjective(input?: {
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

  const openingRule = input?.memory?.isReturning
    ? "When the session begins, speak first using Opening style from relationship memory. Welcome them back by name. Name at most one pattern or calm memory. Ask one curious question. Do NOT introduce yourself as if meeting for the first time. Do NOT offer a menu of focus areas."
    : "When the session begins, speak first: short warm welcome as Forge. No product tour. No onboarding interrogation. One line that they don't have to perform. One curious question about what brought them in (or lightly hold the Home starting place if provided). Then wait. Learn who they are through conversation.";

  const evolutionRule = input?.memory?.adaptiveInsight
    ? `If it fits naturally later (not in the first breath), you may gently notice: ${input.memory.adaptiveInsight}. Never dump it as a status report.`
    : "As patterns appear in this session, notice them gently — don't lecture.";

  return [
    "══════════════════════════════════════",
    "CURRENT MODE: PRACTICE",
    "══════════════════════════════════════",
    "Hierarchy: Forge Core → this objective → conversation evidence → you choose the next move.",
    "This mode does not redefine Forge Core. Goals and capabilities only.",
    "",
    "GOAL: Create room for the member to practice real communication — understand first, then invite reps.",
    "Primary role in this mode: mentor who understands first. Secondary: brief realistic practice partner when invited.",
    "",
    "MODE CAPABILITIES:",
    "- Invite practice, roleplay, reflection, and one highest-impact coaching beat at a time.",
    "- Optional default when it fits: brief reflect then one useful prompt — Forge owns judgment.",
    "- Adapt teaching mode (explain / demonstrate / ask / silence / practice).",
    "- Do not make every turn a coaching lesson — keep roleplay natural.",
    "- Return to practice after each coaching beat.",
    "- Member speaks most of the time when the exercise allows.",
    "",
    eventLine,
    successLine,
    practiceHint,
    openingRule,
    evolutionRule,
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Forge voice presence instructions.
 * Forge Core first; mode supplies goal/capabilities only.
 */
export function buildSystemInstructions(input?: {
  track?: CeTrack;
  eventTitle?: string;
  successCriteria?: string;
  memory?: CoachPromptContext | null;
  conciseMode?: boolean;
  mode?: CeSessionMode;
}): string {
  if (input?.mode === "assessment") {
    return buildAssessmentSystemInstructions({
      memoryBlock: input.memory ? formatCoachMemoryBlock(input.memory) : null,
    });
  }

  const acousticRule = [
    "ACOUSTIC / TURN RULES (operational — not Core limits):",
    "- Members pause while thinking. A pause is not permission to take over.",
    "- Respond only after their thought is complete — never jump into a mid-explanation.",
    "- Coughs, throat clears, and brief non-words are not turns. Wait for real language.",
    "- Prefer waiting and reflecting over filling silence with coaching.",
  ].join("\n");

  return buildForgeSystemPrompt({
    modeObjective: buildPracticeModeObjective(input),
    memoryBlock: input?.memory ? formatCoachMemoryBlock(input.memory) : null,
    extras: [
      LISTEN_FIRST_SYSTEM_INSTRUCTION,
      MINIMAL_INTERVENTION_COACHING_RULES,
      BREVITY_SYSTEM_INSTRUCTION,
      input?.conciseMode ? CONCISE_MODE_INSTRUCTION : "",
      acousticRule,
    ],
  });
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
  mode?: CeSessionMode;
}) {
  // Hands-free (gated): semantic_vad; client owns barge-in yield.
  // Hold-to-talk: create_response OFF — mid-hold thinking pauses must NOT
  // spawn Forge. Client calls response.create only when Hold is released.
  // Assessment: create_response always OFF (see resolveRealtimeTurnDetection).
  const turnDetection = resolveRealtimeTurnDetection({
    mode: input?.mode,
    handsFree: input?.handsFree,
  });

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

/**
 * session.update — disable VAD auto response.create after assessment completion.
 * Preserves instructions; only flips create_response off.
 */
export function buildSessionUpdateDisableAutoResponses() {
  return {
    type: "session.update" as const,
    session: {
      type: "realtime" as const,
      audio: {
        input: {
          turn_detection: {
            type: "server_vad" as const,
            create_response: false,
            interrupt_response: false,
            threshold: 0.65,
            prefix_padding_ms: 300,
            silence_duration_ms: 1200,
          },
        },
      },
    },
  };
}
