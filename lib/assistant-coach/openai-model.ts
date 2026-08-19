/**
 * Phase 4B.4 — production OpenAI model adapter for Assistant Coach turns.
 * Injectable; tests never need this module when they pass a model.
 *
 * Preview/Production: fail closed when OPENAI_API_KEY is missing.
 * Local: mock only when ASSISTANT_COACH_ALLOW_MOCK_MODEL is explicitly enabled.
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
    };
  };
}

function createLiveOpenAiModel(apiKey: string): AssistantCoachModel {
  const client = new OpenAI({ apiKey });

  return async ({ message, history, coachContext }) => {
    const historyBlock = history
      .slice(-12)
      .map((h) => `${h.role === "user" ? "Member" : "Coach"}: ${h.content}`)
      .join("\n");

    const completion = await client.responses.create({
      model: "gpt-5",
      input: `You are TalkForge Coach — a pre-account understanding coach.
Your job is to help the visitor feel understood about a real communication struggle, then deliver concrete help when you have enough context.
You are NOT Forge (no roleplay NPC). You are NOT Assessment.

Rules:
- Ask at most one focused question when still discovering.
- Reflect what you heard; do not invent identity, purpose, or principles.
- Never claim to know their purpose statement.
- When you deliver an actionable coaching move (exercise, rehearsal, technique, strategy, usable wording/opener, or pacing mechanism), include a structured "intervention" object. Do NOT include "intervention" for reflection, validation, summary, or questions alone.
- Return STRICT JSON only:
{"reply":"...","observations":[{"text":"...","category":"communication_goal|communication_context|observed_pattern|communication_friction|communication_strength|preference|practice_capacity|desired_outcome|lived_example|interaction_signal","confidence":"high|medium|low|uncertain"}],"intervention":null|{"kind":"exercise|rehearsal|technique|strategy|wording|pacing|other","summary":"concrete actionable coaching move (≥24 chars)","groundedInCategories":["communication_friction"]}}

Coach context (supported only):
${JSON.stringify(coachContext)}

Conversation so far:
${historyBlock || "(none)"}

Latest member message:
${message}
`,
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
