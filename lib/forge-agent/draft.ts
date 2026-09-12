import "server-only";

import OpenAI from "openai";
import { buildCheckInCopy, practiceHrefForTitle } from "./copy.ts";
import {
  buildDraftUserPrompt,
  measureInputTokenUpperBound,
  sanitizeDraftBody,
} from "./draft-validate.ts";
import {
  FORGE_AGENT_DRAFT_SYSTEM,
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

  const prompt = buildDraftUserPrompt(input);
  if (
    measureInputTokenUpperBound(FORGE_AGENT_DRAFT_SYSTEM, prompt) >
    FORGE_AGENT_MAX_INPUT_TOKENS
  ) {
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
          content: FORGE_AGENT_DRAFT_SYSTEM,
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
