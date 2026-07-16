import OpenAI from "openai";
import type { AtlasContext } from "./context";
import { loadAtlasContext } from "./loader";
import { buildAtlasSystemPrompt } from "./prompt";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * Generate an Atlas response grounded in company documents.
 * Loads AtlasContext when not provided, builds the system prompt,
 * and calls the OpenAI Responses API.
 */
export async function generateAtlasResponse(
  userMessage: string,
  context?: AtlasContext
): Promise<string> {
  const atlasContext = context ?? (await loadAtlasContext());
  const systemPrompt = buildAtlasSystemPrompt(atlasContext);

  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await client.responses.create({
    model: "gpt-5",
    instructions: systemPrompt,
    input: [
      {
        role: "user",
        content: userMessage,
      },
    ],
  });

  const reply = response.output_text?.trim();
  if (!reply) {
    throw new Error("Atlas returned an empty response.");
  }

  return reply;
}
