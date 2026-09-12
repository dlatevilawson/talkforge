import "server-only";

import OpenAI from "openai";
import { buildCheckInCopy, practiceHrefForTitle } from "./copy.ts";
import { estimatePromptTokens, sanitizeDraftBody } from "./draft-validate.ts";
import {
  FORGE_AGENT_MAX_INPUT_TOKENS,
  FORGE_AGENT_MAX_OUTPUT_TOKENS,
  FORGE_AGENT_MODEL_TIMEOUT_MS,
  type ForgeCheckInPayload,
  type ForgeCueKind,
} from "./types.ts";

export type DraftModelUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type DraftResult = {
  payload: ForgeCheckInPayload;
  source: "model" | "template";
  usage: DraftModelUsage;
  errorCode: string | null;
};

function getClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  return new OpenAI({
    apiKey,
    timeout: FORGE_AGENT_MODEL_TIMEOUT_MS,
    maxRetries: 0,
  });
}

export async function draftCheckInPayload(input: {
  kind: ForgeCueKind;
  title: string;
  successCriteria?: string | null;
  contextText?: string;
}): Promise<DraftResult> {
  const template = buildCheckInCopy(input);
  const client = getClient();
  if (!client) {
    return {
      payload: template,
      source: "template",
      usage: { inputTokens: 0, outputTokens: 0 },
      errorCode: "MODEL_UNAVAILABLE",
    };
  }

  const prompt = [
    "Write one next move for an in-app coaching check-in.",
    "Return JSON only: {\"body\":\"...\"}.",
    "No URLs. No advice list. One short sentence.",
    `Declared kind: ${input.kind}`,
    `Declared title: ${input.title}`,
    input.successCriteria
      ? `Declared success: ${input.successCriteria}`
      : "Declared success: (none)",
    input.contextText ? `Approved context:\n${input.contextText}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  if (estimatePromptTokens(prompt) > FORGE_AGENT_MAX_INPUT_TOKENS) {
    return {
      payload: template,
      source: "template",
      usage: { inputTokens: 0, outputTokens: 0 },
      errorCode: "INPUT_TOKEN_CAP",
    };
  }

  try {
    const completion = await client.chat.completions.create({
      model: process.env.OPENAI_FORGE_AGENT_MODEL?.trim() || "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: FORGE_AGENT_MAX_OUTPUT_TOKENS,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You draft one bounded next-move sentence. Never invent events. Never output a URL.",
        },
        { role: "user", content: prompt },
      ],
    });

    const usage: DraftModelUsage = {
      inputTokens: completion.usage?.prompt_tokens ?? 0,
      outputTokens: completion.usage?.completion_tokens ?? 0,
    };
    const raw = completion.choices[0]?.message?.content ?? "";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return {
        payload: template,
        source: "template",
        usage,
        errorCode: "MALFORMED_JSON",
      };
    }
    const record = parsed && typeof parsed === "object" ? parsed : {};
    const body = sanitizeDraftBody((record as { body?: unknown }).body);
    if (!body) {
      return {
        payload: template,
        source: "template",
        usage,
        errorCode: "INVALID_BODY",
      };
    }
    return {
      payload: {
        whySent: template.whySent,
        body,
        practiceHref: practiceHrefForTitle(input.title),
      },
      source: "model",
      usage,
      errorCode: null,
    };
  } catch (error) {
    const code =
      error && typeof error === "object" && "status" in error
        ? `MODEL_${String((error as { status?: unknown }).status ?? "ERROR")}`
        : "MODEL_TIMEOUT";
    return {
      payload: template,
      source: "template",
      usage: { inputTokens: 0, outputTokens: 0 },
      errorCode: code,
    };
  }
}
