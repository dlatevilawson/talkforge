/**
 * CE-M2 transcript event normalization and ordered history.
 * Pure / isomorphic — safe for tests and browser.
 */

export type TranscriptRole = "founder" | "forge";

/** Ordered transcript turn — evidence substrate for CE-M3 coaching. */
export type TranscriptTurn = {
  turnIndex: number;
  role: TranscriptRole;
  text: string;
  itemId?: string;
  responseId?: string;
  finalizedAt: string;
  sourceEvent: string;
};

export type CoachHistoryItem = {
  role: "user" | "npc";
  text: string;
};

/** Map TalkForge roles to existing /api/coach history shape (CE-M3 ready). */
export function toCoachHistory(turns: TranscriptTurn[]): CoachHistoryItem[] {
  return turns.map((turn) => ({
    role: turn.role === "founder" ? ("user" as const) : ("npc" as const),
    text: turn.text,
  }));
}

export type TranscriptApplyResult = {
  turns: TranscriptTurn[];
  /** Newly finalized turn, if any */
  added: TranscriptTurn | null;
};

/**
 * Apply a Realtime server event to ordered transcript state.
 * Only finalized transcripts are appended (deltas ignored for CE-M2 stability).
 */
export function applyRealtimeTranscriptEvent(
  turns: TranscriptTurn[],
  event: Record<string, unknown>
): TranscriptApplyResult {
  const type = typeof event.type === "string" ? event.type : "";

  // Founder (user mic) — finalized input transcription
  if (type === "conversation.item.input_audio_transcription.completed") {
    const text = extractTranscriptText(event);
    if (!text) return { turns, added: null };
    const itemId =
      typeof event.item_id === "string" ? event.item_id : undefined;
    if (itemId && turns.some((t) => t.itemId === itemId && t.role === "founder")) {
      return { turns, added: null };
    }
    const added: TranscriptTurn = {
      turnIndex: turns.length,
      role: "founder",
      text,
      itemId,
      finalizedAt: new Date().toISOString(),
      sourceEvent: type,
    };
    return { turns: [...turns, added], added };
  }

  // Forge (assistant) — finalized output audio transcript
  if (
    type === "response.output_audio_transcript.done" ||
    type === "response.audio_transcript.done"
  ) {
    const text = extractTranscriptText(event);
    if (!text) return { turns, added: null };
    const responseId =
      typeof event.response_id === "string"
        ? event.response_id
        : typeof event.item_id === "string"
          ? event.item_id
          : undefined;
    if (
      responseId &&
      turns.some((t) => t.responseId === responseId && t.role === "forge")
    ) {
      return { turns, added: null };
    }
    const added: TranscriptTurn = {
      turnIndex: turns.length,
      role: "forge",
      text,
      itemId: typeof event.item_id === "string" ? event.item_id : undefined,
      responseId,
      finalizedAt: new Date().toISOString(),
      sourceEvent: type,
    };
    return { turns: [...turns, added], added };
  }

  // Some stacks nest transcript on conversation.item.done / response.output_item.done
  if (
    type === "conversation.item.done" ||
    type === "response.output_item.done"
  ) {
    const item =
      event.item && typeof event.item === "object"
        ? (event.item as Record<string, unknown>)
        : event.output_item && typeof event.output_item === "object"
          ? (event.output_item as Record<string, unknown>)
          : null;
    if (!item) return { turns, added: null };

    const roleRaw = typeof item.role === "string" ? item.role : "";
    const content = Array.isArray(item.content) ? item.content : [];
    let text = "";
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const p = part as Record<string, unknown>;
      if (typeof p.transcript === "string" && p.transcript.trim()) {
        text = p.transcript.trim();
        break;
      }
      if (p.type === "output_audio" && typeof p.transcript === "string") {
        text = p.transcript.trim();
        break;
      }
      if (p.type === "input_audio" && typeof p.transcript === "string") {
        text = p.transcript.trim();
        break;
      }
    }
    if (!text) return { turns, added: null };

    const role: TranscriptRole =
      roleRaw === "user" || roleRaw === "founder" ? "founder" : "forge";
    const itemId = typeof item.id === "string" ? item.id : undefined;
    if (itemId && turns.some((t) => t.itemId === itemId)) {
      return { turns, added: null };
    }

    const added: TranscriptTurn = {
      turnIndex: turns.length,
      role,
      text,
      itemId,
      finalizedAt: new Date().toISOString(),
      sourceEvent: type,
    };
    return { turns: [...turns, added], added };
  }

  return { turns, added: null };
}

function extractTranscriptText(event: Record<string, unknown>): string {
  if (typeof event.transcript === "string" && event.transcript.trim()) {
    return event.transcript.trim();
  }
  if (typeof event.text === "string" && event.text.trim()) {
    return event.text.trim();
  }
  return "";
}

export function summarizeTranscript(turns: TranscriptTurn[]): {
  founderTurns: number;
  forgeTurns: number;
  ordered: boolean;
} {
  let ordered = true;
  for (let i = 0; i < turns.length; i++) {
    if (turns[i].turnIndex !== i) ordered = false;
  }
  return {
    founderTurns: turns.filter((t) => t.role === "founder").length,
    forgeTurns: turns.filter((t) => t.role === "forge").length,
    ordered,
  };
}
