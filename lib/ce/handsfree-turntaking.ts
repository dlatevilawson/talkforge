/**
 * Pro hands-free turn-taking / conversational floor ownership (pure).
 *
 * Model: who owns the floor — not how fast we cut silence.
 * User interruption is a normal yield, never a connection failure.
 */

export type TurnState =
  | "listening"
  | "user_speaking"
  | "forge_thinking"
  | "forge_speaking"
  | "interrupted";

export type FloorOwner = "forge" | "member" | "none";

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
  /** Duck/mute remote Forge playback immediately (yield feel). */
  duckForgeAudio: boolean;
  /** Outbound mic audio may be sent to OpenAI. */
  openOutboundMic: boolean;
  /** Server speech_started alone must never cancel Forge. */
  ignoreServerSpeechAsBargeIn: boolean;
};

export function floorOwner(state: TurnState): FloorOwner {
  if (state === "forge_speaking" || state === "forge_thinking") return "forge";
  if (state === "user_speaking" || state === "interrupted") return "member";
  return "none";
}

export function memberOwnsFloor(state: TurnState): boolean {
  return floorOwner(state) === "member";
}

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

/**
 * Cancellation / interrupt / overlap noise from Realtime.
 * These are conversational mechanics — never connection failures.
 */
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
    haystack.includes("active response") ||
    haystack.includes("no active response") ||
    haystack.includes("already_has_active") ||
    haystack.includes("item_id") ||
    haystack.includes("buffer") ||
    haystack.includes("input_audio") ||
    haystack.includes("response.done") ||
    haystack.includes("rate_limit")
  );
}

/**
 * Whether a Realtime `error` event should touch member-facing recovery UI.
 * Interruption / cancel / member-owned floor → never.
 */
export function shouldSurfaceRealtimeError(
  event: Record<string, unknown>,
  state: TurnState,
  peerState?: string | null
): boolean {
  if (isBenignRealtimeError(event)) return false;
  if (memberOwnsFloor(state)) return false;
  // Healthy peer → treat as non-fatal API noise, not a hitch.
  if (peerState === "connected" || peerState === "connecting") return false;
  return true;
}

/**
 * Echo-aware barge-in confirmation.
 * Distinguishes intentional speech from speaker bleed / ambient noise.
 */
export function isConfirmedBargeInLevel(input: {
  level: number;
  echoFloor: number;
  sustainedMs: number;
  absoluteFloor?: number;
  echoMultiplier?: number;
  minSustainMs?: number;
}): boolean {
  const absoluteFloor = input.absoluteFloor ?? 0.22;
  const echoMultiplier = input.echoMultiplier ?? 2.6;
  const minSustainMs = input.minSustainMs ?? 220;
  const threshold = Math.max(absoluteFloor, input.echoFloor * echoMultiplier);
  return input.level >= threshold && input.sustainedMs >= minSustainMs;
}

/** Ambient / cough / TV bleed — must not confirm barge-in. */
export function looksLikeEnvironmentalAudio(input: {
  level: number;
  echoFloor: number;
  sustainedMs: number;
}): boolean {
  return !isConfirmedBargeInLevel(input);
}

export function reduceTurnState(
  state: TurnState,
  event: TurnEvent
): TurnTransition {
  const base = {
    from: state,
    ignoreServerSpeechAsBargeIn: true,
    duckForgeAudio: false,
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
      // Member still owns the floor after barge-in — ignore stale creates.
      if (memberOwnsFloor(state)) {
        return hold(
          state,
          event.type,
          "ignore_forge_create_member_owns_floor"
        );
      }
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
      if (memberOwnsFloor(state)) {
        return {
          ...hold(state, event.type, "ignore_forge_audio_member_owns_floor"),
          duckForgeAudio: true,
        };
      }
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
      // Cancelled/stale response finishing must not steal the floor back.
      if (memberOwnsFloor(state)) {
        return hold(
          state,
          event.type,
          "cancelled_response_done_member_owns_floor"
        );
      }
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
        reason: `natural_yield_confirmed_barge_in_level_${event.level.toFixed(2)}`,
        cancelForge: true,
        duckForgeAudio: true,
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
    duckForgeAudio: false,
    openOutboundMic: outboundMicOpenForState(state),
    ignoreServerSpeechAsBargeIn: true,
  };
}

export function logTurnTransition(transition: TurnTransition): void {
  if (transition.from === transition.to && !transition.cancelForge) {
    if (
      transition.reason.startsWith("ignore_") ||
      transition.reason.includes("barge_in") ||
      transition.reason.includes("member_owns_floor")
    ) {
      console.info("[handsfree]", transition);
    }
    return;
  }
  console.info("[handsfree]", {
    ...transition,
    floorFrom: floorOwner(transition.from),
    floorTo: floorOwner(transition.to),
  });
}
