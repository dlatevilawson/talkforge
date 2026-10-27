/**
 * CE-M2 transcript event normalization and ordered history.
 * Pure / isomorphic — safe for tests and browser.
 */

export type TranscriptRole = "founder" | "forge";

export type TranscriptWord = {
  word: string;
  startOffsetMs: number;
  endOffsetMs: number;
};

/** Ordered transcript turn — evidence substrate for CE-M3 coaching. */
export type TranscriptTurn = {
  turnIndex: number;
  role: TranscriptRole;
  text: string;
  itemId?: string;
  responseId?: string;
  finalizedAt: string;
  sourceEvent: string;
  /** Relative audio offsets are present only when the realtime event supplies them. */
  startOffsetMs?: number;
  endOffsetMs?: number;
  timingSource?: "realtime_event" | "not_measured";
  words?: TranscriptWord[];
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

export type FinalizedFounderTranscript = {
  text: string;
  itemId?: string;
};

/** Extract a finalized member transcript before it is admitted to UI/history. */
export function extractFinalizedFounderTranscript(
  event: Record<string, unknown>
): FinalizedFounderTranscript | null {
  const type = typeof event.type === "string" ? event.type : "";
  if (type === "conversation.item.input_audio_transcription.completed") {
    const text = extractTranscriptText(event);
    if (!text) return null;
    return {
      text,
      itemId: typeof event.item_id === "string" ? event.item_id : undefined,
    };
  }

  if (type !== "conversation.item.done") return null;
  const item =
    event.item && typeof event.item === "object"
      ? (event.item as Record<string, unknown>)
      : null;
  if (!item || (item.role !== "user" && item.role !== "founder")) return null;
  const content = Array.isArray(item.content) ? item.content : [];
  for (const part of content) {
    if (!part || typeof part !== "object") continue;
    const p = part as Record<string, unknown>;
    if (p.type === "input_audio" && typeof p.transcript === "string") {
      const text = p.transcript.trim();
      if (!text) return null;
      return {
        text,
        itemId: typeof item.id === "string" ? item.id : undefined,
      };
    }
  }
  return null;
}

/**
 * Apply a Realtime server event to ordered transcript state.
 * Only finalized transcripts are appended (deltas ignored for CE-M2 stability).
 */
export function applyRealtimeTranscriptEvent(
  turns: TranscriptTurn[],
  event: Record<string, unknown>,
  options?: { sessionStartedAt?: string }
): TranscriptApplyResult {
  const type = typeof event.type === "string" ? event.type : "";

  // Founder (user mic) — finalized input transcription
  const founderTranscript = extractFinalizedFounderTranscript(event);
  if (founderTranscript) {
    const { text, itemId } = founderTranscript;
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
      ...extractRelativeOffsets(event, options?.sessionStartedAt),
      words: extractWordTimings(event),
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
      ...extractRelativeOffsets(event, options?.sessionStartedAt),
      words: extractWordTimings(event),
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
      ...extractRelativeOffsets(event, options?.sessionStartedAt),
      words: extractWordTimings(event),
    };
    return { turns: [...turns, added], added };
  }

  return { turns, added: null };
}

function extractWordTimings(event: Record<string, unknown>): TranscriptWord[] {
  const raw = Array.isArray(event.words)
    ? event.words
    : event.transcript && typeof event.transcript === "object" &&
        Array.isArray((event.transcript as Record<string, unknown>).words)
      ? ((event.transcript as Record<string, unknown>).words as unknown[])
      : [];
  return raw.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const row = item as Record<string, unknown>;
    const word = typeof row.word === "string" ? row.word.trim() : "";
    const start = typeof row.start === "number" ? row.start : row.start_offset_ms;
    const end = typeof row.end === "number" ? row.end : row.end_offset_ms;
    if (!word || typeof start !== "number" || typeof end !== "number") return [];
    if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) return [];
    // Provider word offsets are commonly seconds; explicit *_ms fields are ms.
    const multiplier = typeof row.start_offset_ms === "number" || typeof row.end_offset_ms === "number" ? 1 : 1000;
    return [{ word, startOffsetMs: Math.round(start * multiplier), endOffsetMs: Math.round(end * multiplier) }];
  });
}

function extractRelativeOffsets(
  event: Record<string, unknown>,
  sessionStartedAt?: string
): Pick<TranscriptTurn, "startOffsetMs" | "endOffsetMs" | "timingSource"> {
  const start = readOffset(event, "audio_start_ms", "start_offset_ms");
  const end = readOffset(event, "audio_end_ms", "end_offset_ms");
  if (typeof start === "number" || typeof end === "number") {
    return {
      startOffsetMs: start,
      endOffsetMs: end,
      timingSource: "realtime_event",
    };
  }
  // Finalization time is not a speech boundary. Keep it explicitly unmeasured.
  void sessionStartedAt;
  return { timingSource: "not_measured" };
}

function readOffset(
  event: Record<string, unknown>,
  ...keys: string[]
): number | undefined {
  for (const key of keys) {
    const value = event[key];
    if (typeof value === "number" && Number.isFinite(value) && value >= 0) {
      return Math.round(value);
    }
  }
  return undefined;
}

/** Live partial transcript from Realtime delta events (UI only — not persisted). */
export function extractLiveTranscriptDelta(
  event: Record<string, unknown>
): { role: TranscriptRole; delta: string; done: boolean } | null {
  const type = typeof event.type === "string" ? event.type : "";
  if (!type) return null;

  if (
    type === "response.output_audio_transcript.done" ||
    type === "response.audio_transcript.done"
  ) {
    return { role: "forge", delta: "", done: true };
  }
  if (type === "conversation.item.input_audio_transcription.completed") {
    return { role: "founder", delta: "", done: true };
  }

  const deltaRaw =
    typeof event.delta === "string"
      ? event.delta
      : typeof event.transcript === "string"
        ? event.transcript
        : "";

  if (
    type === "response.output_audio_transcript.delta" ||
    type === "response.audio_transcript.delta"
  ) {
    if (!deltaRaw) return null;
    return { role: "forge", delta: deltaRaw, done: false };
  }

  if (
    type === "conversation.item.input_audio_transcription.delta" ||
    type === "conversation.item.input_audio_transcription.partial"
  ) {
    if (!deltaRaw) return null;
    return { role: "founder", delta: deltaRaw, done: false };
  }

  return null;
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
