/**
 * Phase 4B.4 — production OpenAI model adapter for Assistant Coach turns.
 * Injectable; tests never need this module when they pass a model.
 *
 * Preview/Production: fail closed when OPENAI_API_KEY is missing.
 * Local: mock only when ASSISTANT_COACH_ALLOW_MOCK_MODEL is explicitly enabled.
 *
 * Behavioral authority is AC-local (Decision 059 / IV-PROD-009 / AC-JOURNEY).
 * Do not import Forge coaching philosophy here.
 */
import OpenAI from "openai";
import { AssistantCoachConfigError } from "./config.ts";
import type { AssistantCoachModel } from "./turn-runtime.ts";

export const OPENAI_API_KEY_ENV = "OPENAI_API_KEY";

/** Explicit local/dev opt-in for canned mock replies. Never honored on Vercel preview/prod. */
export const ASSISTANT_COACH_ALLOW_MOCK_MODEL_ENV =
  "ASSISTANT_COACH_ALLOW_MOCK_MODEL";

export const ASSISTANT_COACH_MODEL_NOT_CONFIGURED_PUBLIC =
  "Assistant Coach model is not configured.";

export type AssistantCoachModelMode =
  | "openai"
  | "explicit_mock"
  | "unavailable";

function truthyFlag(raw: string | undefined): boolean {
  const v = raw?.trim().toLowerCase() ?? "";
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

/**
 * Vercel Preview + Production (and generic NODE_ENV=production) must never
 * silently serve mock Coach replies.
 */
export function isHostedAssistantCoachRuntime(
  env: NodeJS.ProcessEnv = process.env
): boolean {
  return (
    env.VERCEL_ENV === "production" ||
    env.VERCEL_ENV === "preview" ||
    env.NODE_ENV === "production"
  );
}

export function resolveAssistantCoachModelMode(
  env: NodeJS.ProcessEnv = process.env
): AssistantCoachModelMode {
  if (env[OPENAI_API_KEY_ENV]?.trim()) return "openai";
  const allowMock = truthyFlag(env[ASSISTANT_COACH_ALLOW_MOCK_MODEL_ENV]);
  if (allowMock && !isHostedAssistantCoachRuntime(env)) {
    return "explicit_mock";
  }
  return "unavailable";
}

/**
 * AC behavioral instructions — onboarding understanding first.
 * Exported for regression tests; keep Forge policy out.
 */
export function buildAssistantCoachTurnPrompt(input: {
  message: string;
  history: Array<{ role: "user" | "assistant"; content: string }>;
  coachContext: unknown;
}): string {
  const historyBlock = input.history
    .slice(-12)
    .map((h) => `${h.role === "user" ? "Member" : "Coach"}: ${h.content}`)
    .join("\n");

  return `You are TalkForge Assistant Coach — the pre-account onboarding understanding coach.
Your job is to help the visitor feel meaningfully understood about a real communication struggle, and to discover what is specifically hard for them through conversation.
You accumulate conversational evidence; you are NOT Assessment and NOT the full persistent coaching product (Forge).

Default mode = understanding and discovery.
- Replies should be concise, natural, and grounded only in what the visitor actually said.
- Prefer one useful reflection and, when needed, one focused question.
- Do not simultaneously pile on questions and prescriptions.
- Do not treat generic requests such as "I need help with delivery" / "help me present" as enough context for a comprehensive solution.
- Do not produce curricula, launch kits, multi-step training programs, exhaustive checklists, or several techniques at once.

Intervention (optional, earned — not required every turn):
- Offer an intervention only when the known struggle is specific enough that one concrete move is genuinely grounded in accumulated evidence from this conversation.
- When appropriate, keep it small and proportionate: one useful move that advances this conversation.
- "One move" is a scope principle, not a turn-count requirement. You may continue understanding instead of intervening when that is the better next response.
- After an intervention, keep learning from the visitor's response; do not treat the intervention as the end of discovery.
- When you deliver a genuine actionable move, set the structured "intervention" object. Otherwise set "intervention" to null.
- Reflection, validation, summary, or a question alone → intervention must be null.

Own no identity/purpose authority:
- Do not invent identity, purpose, or principles.
- Never claim to know their purpose statement.

Return STRICT JSON only:
{"reply":"...","observations":[{"text":"...","category":"communication_goal|communication_context|observed_pattern|communication_friction|communication_strength|preference|practice_capacity|desired_outcome|lived_example|interaction_signal","confidence":"high|medium|low|uncertain"}],"intervention":null|{"kind":"exercise|rehearsal|technique|strategy|wording|pacing|other","summary":"one concrete grounded move (≥24 chars)","groundedInCategories":["communication_friction"]}}

Coach context (supported only):
${JSON.stringify(input.coachContext)}

Conversation so far:
${historyBlock || "(none)"}

Latest member message:
${input.message}
`;
}

/**
 * Deterministic local/test mock — only when explicitly enabled off-hosted.
 */
export function createExplicitMockAssistantCoachModel(): AssistantCoachModel {
  return async ({ message, coachContext }) => {
    const focus = coachContext.activeFocusAreas[0] || "your communication";
    return {
      reply: `I'm listening. You said you're working through something around ${focus}. Tell me more about what happens in the moment — what do you notice in your body or voice when that shows up?`,
      observations: [
        {
          text: message.slice(0, 240),
          category: "communication_context",
          confidence: "medium",
        },
      ],
      intervention: null,
    };
  };
}

function createLiveOpenAiModel(apiKey: string): AssistantCoachModel {
  const client = new OpenAI({ apiKey });

  return async ({ message, history, coachContext }) => {
    const completion = await client.responses.create({
      model: "gpt-5",
      input: buildAssistantCoachTurnPrompt({ message, history, coachContext }),
    });

    const raw =
      typeof completion.output_text === "string"
        ? completion.output_text
        : "";
    const cleaned = raw
      .trim()
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    try {
      const parsed = JSON.parse(cleaned) as {
        reply?: unknown;
        observations?: unknown;
        intervention?: unknown;
      };
      return {
        reply: typeof parsed.reply === "string" ? parsed.reply : "",
        observations: parsed.observations,
        intervention: parsed.intervention ?? null,
      };
    } catch {
      return {
        reply:
          cleaned ||
          "I'm here with you — say a bit more about what matters in that conversation.",
        observations: [],
        intervention: null,
      };
    }
  };
}

/**
 * Production adapter used by the turn route.
 * Throws AssistantCoachConfigError (public message) when the real credential
 * is missing on hosted runtimes — never returns silent mock replies there.
 */
export function createOpenAiAssistantCoachModel(
  env: NodeJS.ProcessEnv = process.env
): AssistantCoachModel {
  const mode = resolveAssistantCoachModelMode(env);
  if (mode === "openai") {
    return createLiveOpenAiModel(env[OPENAI_API_KEY_ENV]!.trim());
  }
  if (mode === "explicit_mock") {
    return createExplicitMockAssistantCoachModel();
  }

  console.error(
    `Assistant Coach model unavailable: ${OPENAI_API_KEY_ENV} is not configured`
  );
  throw new AssistantCoachConfigError(
    ASSISTANT_COACH_MODEL_NOT_CONFIGURED_PUBLIC
  );
}
