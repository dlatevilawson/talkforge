/**
 * Pro hands-free turn-taking policy (pure).
 *
 * Prevents Forge TTS / speaker echo from being treated as member speech,
 * and prevents recursive response.create loops after Forge finishes.
 */

export type TurnState =
  | "listening"
  | "user_speaking"
  | "forge_thinking"
  | "forge_speaking"
  | "interrupted";

export type TurnEvent =
  | { type: "USER_SPEECH_STARTED"; source: "server_vad" | "local_energy" }
  | { type: "USER_SPEECH_STOPPED"; source: "server_vad" | "local_energy" }
  | { type: "FORGE_RESPONSE_CREATED"; responseId?: string }
  | { type: "FORGE_AUDIO_DELTA" }
  | { type: "FORGE_RESPONSE_DONE"; responseId?: string }
  | { type: "CONFIRMED_BARGE_IN"; level: number }
  | { type: "LONG_SILENCE" };

export type TurnTransition = {
  from: TurnState;
  to: TurnState;
  event: TurnEvent["type"];
  reason: string;
  /** Client may send response.cancel only when this is true. */
  cancelForge: boolean;
  /** Outbound mic audio may be sent to OpenAI. */
  openOutboundMic: boolean;
  /** Server speech_started alone must never cancel Forge. */
  ignoreServerSpeechAsBargeIn: boolean;
};

export function outboundMicOpenForState(state: TurnState): boolean {
  // Mute outbound while Forge owns the floor so speaker echo cannot hit server VAD.
  return state === "listening" || state === "user_speaking" || state === "interrupted";
}

/** True only for assistant/Forge output events — never input mic events. */
export function isForgeOutputEventType(type: string): boolean {
  if (!type) return false;
  if (type.startsWith("input_audio")) return false;
  if (type.includes("input_audio_transcription")) return false;
  return (
    type === "response.created" ||
    type === "response.output_item.added" ||
    type === "response.output_audio.delta" ||
    type === "response.output_audio.done" ||
    type === "response.output_audio_transcript.delta" ||
    type === "response.output_audio_transcript.done" ||
    type === "response.audio.delta" ||
    type === "response.audio.done" ||
    type === "response.audio_transcript.delta" ||
    type === "response.audio_transcript.done"
  );
}

/** Cancellation / benign Realtime errors must not surface as connection hitches. */
export function isBenignRealtimeError(event: Record<string, unknown>): boolean {
  const err =
    event.error && typeof event.error === "object"
      ? (event.error as Record<string, unknown>)
      : null;
  const code = typeof err?.code === "string" ? err.code.toLowerCase() : "";
  const message =
    typeof err?.message === "string" ? err.message.toLowerCase() : "";
  const nested =
    typeof event.message === "string" ? event.message.toLowerCase() : "";
  const haystack = `${code} ${message} ${nested}`;
  return (
    haystack.includes("cancel") ||
    haystack.includes("interrupted") ||
    haystack.includes("response_cancel") ||
    haystack.includes("conversation_already_has_active_response") ||
    haystack.includes("no active response")
  );
}

/**
 * Echo-aware barge-in confirmation.
 * Forge speaker bleed raises the mic floor; only a clear excess counts as the member.
 */
export function isConfirmedBargeInLevel(input: {
  level: number;
  echoFloor: number;
  sustainedMs: number;
  /** Absolute floor so quiet rooms still require real speech. */
  absoluteFloor?: number;
  /** Multiplier over echo floor. */
  echoMultiplier?: number;
  /** Require sustained energy this long. */
  minSustainMs?: number;
}): boolean {
  const absoluteFloor = input.absoluteFloor ?? 0.2;
  const echoMultiplier = input.echoMultiplier ?? 2.4;
  const minSustainMs = input.minSustainMs ?? 180;
  const threshold = Math.max(absoluteFloor, input.echoFloor * echoMultiplier);
  return input.level >= threshold && input.sustainedMs >= minSustainMs;
}

export function reduceTurnState(
  state: TurnState,
  event: TurnEvent
): TurnTransition {
  const base = {
    from: state,
    ignoreServerSpeechAsBargeIn: true,
  };

  switch (event.type) {
    case "USER_SPEECH_STARTED": {
      // Server VAD during forge_speaking is almost always speaker echo on phones.
      if (state === "forge_speaking" || state === "forge_thinking") {
        return {
          ...base,
          to: state,
          event: event.type,
          reason: `ignore_${event.source}_during_${state}_not_confirmed_barge_in`,
          cancelForge: false,
          openOutboundMic: outboundMicOpenForState(state),
          ignoreServerSpeechAsBargeIn: true,
        };
      }
      if (state === "listening" || state === "interrupted") {
        const to: TurnState = "user_speaking";
        return {
          ...base,
          to,
          event: event.type,
          reason: `member_turn_started_via_${event.source}`,
          cancelForge: false,
          openOutboundMic: true,
          ignoreServerSpeechAsBargeIn: false,
        };
      }
      return hold(state, event.type, "no_op_already_in_member_turn");
    }

    case "USER_SPEECH_STOPPED": {
      if (state === "user_speaking" || state === "interrupted") {
        // Server create_response handles the next Forge turn — we only mark thinking.
        const to: TurnState = "forge_thinking";
        return {
          ...base,
          to,
          event: event.type,
          reason: "member_turn_ended_awaiting_forge",
          cancelForge: false,
          openOutboundMic: false,
          ignoreServerSpeechAsBargeIn: true,
        };
      }
      return hold(state, event.type, "ignore_speech_stopped_outside_member_turn");
    }

    case "FORGE_RESPONSE_CREATED": {
      const to: TurnState = "forge_thinking";
      return {
        ...base,
        to,
        event: event.type,
        reason: "forge_response_created",
        cancelForge: false,
        openOutboundMic: false,
        ignoreServerSpeechAsBargeIn: true,
      };
    }

    case "FORGE_AUDIO_DELTA": {
      const to: TurnState = "forge_speaking";
      return {
        ...base,
        to,
        event: event.type,
        reason: "forge_audio_playing",
        cancelForge: false,
        openOutboundMic: false,
        ignoreServerSpeechAsBargeIn: true,
      };
    }

    case "FORGE_RESPONSE_DONE": {
      // Critical: return to listening only — do NOT create another response.
      const to: TurnState = "listening";
      return {
        ...base,
        to,
        event: event.type,
        reason: "forge_finished_wait_for_new_member_utterance",
        cancelForge: false,
        openOutboundMic: true,
        ignoreServerSpeechAsBargeIn: true,
      };
    }

    case "CONFIRMED_BARGE_IN": {
      if (state !== "forge_speaking" && state !== "forge_thinking") {
        return hold(state, event.type, "barge_in_ignored_forge_not_speaking");
      }
      const to: TurnState = "interrupted";
      return {
        ...base,
        to,
        event: event.type,
        reason: `confirmed_user_barge_in_level_${event.level.toFixed(2)}`,
        cancelForge: true,
        openOutboundMic: true,
        ignoreServerSpeechAsBargeIn: false,
      };
    }

    case "LONG_SILENCE": {
      if (state === "listening") {
        return hold(state, event.type, "silence_after_forge_noop");
      }
      return hold(state, event.type, "silence_ignored");
    }

    default:
      return hold(state, "USER_SPEECH_STARTED", "unknown_event");
  }
}

function hold(
  state: TurnState,
  event: TurnEvent["type"],
  reason: string
): TurnTransition {
  return {
    from: state,
    to: state,
    event,
    reason,
    cancelForge: false,
    openOutboundMic: outboundMicOpenForState(state),
    ignoreServerSpeechAsBargeIn: true,
  };
}

export function logTurnTransition(transition: TurnTransition): void {
  if (transition.from === transition.to && !transition.cancelForge) {
    // Still log ignored barge-in attempts — these are the failure mode we ship against.
    if (
      transition.reason.startsWith("ignore_") ||
      transition.reason.includes("barge_in")
    ) {
      console.info("[handsfree]", transition);
    }
    return;
  }
  console.info("[handsfree]", transition);
}
