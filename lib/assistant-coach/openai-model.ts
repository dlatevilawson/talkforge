/**
 * Phase 4B.4 — production OpenAI model adapter for Assistant Coach turns.
 * Injectable; tests never call this module.
 */
import OpenAI from "openai";
import type { AssistantCoachModel } from "./turn-runtime.ts";

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return new OpenAI({ apiKey });
}

/**
 * Deterministic fallback when OPENAI_API_KEY is absent (local/dev only).
 * Production previews should configure the key.
 */
function mockModel(): AssistantCoachModel {
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

export function createOpenAiAssistantCoachModel(): AssistantCoachModel {
  const client = getClient();
  if (!client) return mockModel();

  return async ({ message, history, coachContext }) => {
    const historyBlock = history
      .slice(-12)
      .map((h) => `${h.role === "user" ? "Member" : "Coach"}: ${h.content}`)
      .join("\n");

    const completion = await client.responses.create({
      model: "gpt-5",
      input: `You are TalkForge Assistant Coach — a pre-account understanding coach.
Your job is to help the visitor feel understood about a real communication struggle.
You are NOT Forge (no roleplay NPC). You are NOT Assessment.

Rules:
- Ask at most one focused question.
- Reflect what you heard; do not invent identity, purpose, or principles.
- Never claim to know their purpose statement.
- Return STRICT JSON only:
{"reply":"...","observations":[{"text":"...","category":"communication_goal|communication_context|observed_pattern|communication_friction|communication_strength|preference|practice_capacity|desired_outcome|lived_example|interaction_signal","confidence":"high|medium|low|uncertain"}]}

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
      };
      return {
        reply: typeof parsed.reply === "string" ? parsed.reply : "",
        observations: parsed.observations,
      };
    } catch {
      return {
        reply: cleaned || "I'm here with you — say a bit more about what matters in that conversation.",
        observations: [],
      };
    }
  };
}
