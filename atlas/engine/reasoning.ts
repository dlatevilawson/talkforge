import OpenAI from "openai";
import type { AtlasContext } from "./context.ts";
import { loadAtlasContext } from "./loader.ts";
import {
  formatOperationalMemoryForCounsel,
  retrieveRelevantExecutiveMemory,
  type ExecutiveMemoryRecord,
} from "./executive-memory.ts";
import { buildAtlasSystemPrompt } from "./prompt.ts";
import type { AtlasThreadTurn } from "./thread.ts";

function getOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

/**
 * Build Ask Atlas instructions. Later sittings may receive relevant
 * Operational Executive Memory with provenance. It is never Canonical.
 */
export function buildAskAtlasCounselInstructions(
  systemPrompt: string,
  thread: AtlasThreadTurn[],
  storedMemory: ExecutiveMemoryRecord[],
  currentMessage: string
): { instructions: string; recalled: ExecutiveMemoryRecord[] } {
  const sittingNote =
    thread.length > 0
      ? "\n\nA short Ask Atlas thread from this sitting may be present. Continue it. It is Temporary, not Canonical, and is not a new company document."
      : "\n\nThis is a new Ask Atlas sitting. Do not assume a prior chat thread.";
  const recalled = retrieveRelevantExecutiveMemory(currentMessage, storedMemory);
  const memoryBlock = formatOperationalMemoryForCounsel(recalled);
  const memoryNote = memoryBlock
    ? `\n\n## Operational Executive Memory (not Canonical)\nThese classified Memory Keeper records were retrieved because they are relevant to this sitting. They are Operational or Promotion Candidate, with provenance. They are not Constitution, Decisions, or Canonical company truth. Use relevant records as live operational recall. Do not present them as admitted Canonical knowledge. Do not mention stored records that are not listed here.\n\n${memoryBlock}`
    : "\n\nNo relevant Operational Executive Memory was retrieved for this sitting. Do not invent prior counsel.";
  return {
    instructions: `${systemPrompt}${sittingNote}${memoryNote}`,
    recalled,
  };
}

/**
 * Generate an Atlas response grounded in company documents.
 * Optional thread is this sitting only — Temporary, not Canonical memory.
 * Stored Executive Memory is recalled only when relevant to the new message.
 */
export async function generateAtlasResponse(
  userMessage: string,
  context?: AtlasContext,
  thread: AtlasThreadTurn[] = [],
  operationalMemory: ExecutiveMemoryRecord[] = []
): Promise<{
  response: string;
  recalled: ExecutiveMemoryRecord[];
  canonical: false;
}> {
  const atlasContext = context ?? (await loadAtlasContext());
  const systemPrompt = buildAtlasSystemPrompt(atlasContext);
  const { instructions, recalled } = buildAskAtlasCounselInstructions(
    systemPrompt,
    thread,
    operationalMemory,
    userMessage
  );

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

  return { response: reply, recalled, canonical: false as const };
}
