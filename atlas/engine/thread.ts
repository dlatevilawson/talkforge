/**
 * Ask Atlas thread — this sitting only (Temporary).
 * Not Canonical. Not an identity store.
 * Durable recall happens only after Memory Keeper classifies at sitting close.
 */

export type AtlasThreadTurn = {
  role: "user" | "assistant";
  content: string;
};

export const ATLAS_THREAD_MAX_TURNS = 10;
export const ATLAS_THREAD_MAX_CHARS = 4000;

export function normalizeAtlasThread(raw: unknown): AtlasThreadTurn[] {
  if (!Array.isArray(raw)) return [];

  const turns: AtlasThreadTurn[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const role = (item as { role?: unknown }).role;
    const content = (item as { content?: unknown }).content;
    if (role !== "user" && role !== "assistant") continue;
    if (typeof content !== "string") continue;
    const trimmed = content.trim().slice(0, ATLAS_THREAD_MAX_CHARS);
    if (!trimmed) continue;
    turns.push({ role, content: trimmed });
    if (turns.length >= ATLAS_THREAD_MAX_TURNS) break;
  }
  return turns;
}
