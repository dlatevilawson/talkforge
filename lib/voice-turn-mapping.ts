import type { ConversationTurn } from "./types";

/** Map the realtime transcript roles to the persisted conversation roles. */
export function voiceTurnsToConversationTurns(
  turns: Array<{ role: "founder" | "forge"; text: string }>
): ConversationTurn[] {
  return turns
    .filter((turn) => typeof turn.text === "string" && turn.text.trim())
    .map((turn) => ({
      role: turn.role === "founder" ? ("user" as const) : ("npc" as const),
      text: turn.text.trim(),
    }));
}
