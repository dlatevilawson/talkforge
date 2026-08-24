import OpenAI from "openai";
import type { AtlasContext } from "./context";
import { loadAtlasContext } from "./loader";
import {
  formatOperationalMemoryForCounsel,
  type ExecutiveMemoryRecord,
} from "./executive-memory";
import { buildAtlasSystemPrompt } from "./prompt";
import type { AtlasThreadTurn } from "./thread";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * Generate an Atlas response grounded in company documents.
 * Optional thread is this sitting only — Temporary, not Canonical memory.
 */
export async function generateAtlasResponse(
  userMessage: string,
  context?: AtlasContext,
  thread: AtlasThreadTurn[] = [],
  operationalMemory: ExecutiveMemoryRecord[] = []
): Promise<string> {
  const atlasContext = context ?? (await loadAtlasContext());
  const systemPrompt = buildAtlasSystemPrompt(atlasContext);
  const sittingNote =
    thread.length > 0
      ? "\n\nA short Ask Atlas thread from this sitting may be present. Continue it. It is Temporary, not Canonical, and is not a new company document."
      : "";
  const memoryBlock = formatOperationalMemoryForCounsel(operationalMemory);
  const memoryNote = memoryBlock
    ? `\n\n## Operational Executive Memory (not Canonical)\nThese classified Memory Keeper records are Operational or Promotion Candidate. They are not Constitution, Decisions, or Canonical company truth. Use them as live operational recall. Do not present them as admitted Canonical knowledge.\n\n${memoryBlock}`
    : "";
  const instructions = `${systemPrompt}${sittingNote}${memoryNote}`;

  const client = getOpenAIClient();
  if (!client) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const response = await client.responses.create({
    model: "gpt-5",
    instructions,
    input: [
      ...thread.map((turn) => ({
        role: turn.role,
        content: turn.content,
      })),
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
