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
  // Only send mic audio while the member owns the floor.
  // Listening stays outbound-muted so TV / ambient cannot trigger server VAD.
  return state === "user_speaking" || state === "interrupted";
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
 *
 * Default: NO. Interruption / cancel / unknown peer / healthy peer → never.
 * Only a truly failed/closed peer may surface recovery UI — and even then
 * VoiceArena prefers the peer `failed` handler over hitch copy.
 */
export function shouldSurfaceRealtimeError(
  event: Record<string, unknown>,
  state: TurnState,
  peerState?: string | null
): boolean {
  if (isBenignRealtimeError(event)) return false;
  if (memberOwnsFloor(state)) return false;
  // Unknown / healthy / reconnecting peer → never hitch from API error events.
  if (
    !peerState ||
    peerState === "connected" ||
    peerState === "connecting" ||
    peerState === "new" ||
    peerState === "checking"
  ) {
    return false;
  }
  // Only failed/closed/disconnected peers could warrant recovery — still no
  // hitch string; caller should use peer-failure UI instead.
  return false;
}

/**
 * Echo-aware barge-in confirmation (Forge speaking).
 * Stricter than listening-turn open — speaker bleed is loud on iPhone.
 */
export function isConfirmedBargeInLevel(input: {
  level: number;
  echoFloor: number;
  sustainedMs: number;
  absoluteFloor?: number;
  echoMultiplier?: number;
  minSustainMs?: number;
  modulation?: number;
  speechBandRatio?: number;
}): boolean {
  const absoluteFloor = input.absoluteFloor ?? 0.28;
  const echoMultiplier = input.echoMultiplier ?? 3.2;
  const minSustainMs = input.minSustainMs ?? 320;
  const threshold = Math.max(absoluteFloor, input.echoFloor * echoMultiplier);
  if (input.level < threshold || input.sustainedMs < minSustainMs) return false;
  return passesSpeechShape({
    modulation: input.modulation,
    speechBandRatio: input.speechBandRatio,
    // Barge-in can be slightly looser on shape — distance-to-phone varies.
    minModulation: 0.035,
    minSpeechBandRatio: 0.28,
  });
}

/**
 * Intentional speech while Listening (Forge quiet).
 * Rejects steady ambient / TV / HVAC that would otherwise open a false turn.
 */
export function isIntentionalSpeechSignal(input: {
  level: number;
  ambientFloor: number;
  sustainedMs: number;
  modulation: number;
  speechBandRatio: number;
  absoluteFloor?: number;
  ambientMultiplier?: number;
  minSustainMs?: number;
}): boolean {
  const absoluteFloor = input.absoluteFloor ?? 0.2;
  const ambientMultiplier = input.ambientMultiplier ?? 2.8;
  const minSustainMs = input.minSustainMs ?? 380;
  const threshold = Math.max(
    absoluteFloor,
    input.ambientFloor * ambientMultiplier
  );
  if (input.level < threshold || input.sustainedMs < minSustainMs) return false;
  return passesSpeechShape({
    modulation: input.modulation,
    speechBandRatio: input.speechBandRatio,
    minModulation: 0.045,
    minSpeechBandRatio: 0.32,
  });
}

function passesSpeechShape(input: {
  modulation?: number;
  speechBandRatio?: number;
  minModulation: number;
  minSpeechBandRatio: number;
}): boolean {
  const modulation = input.modulation ?? 1;
  const speechBandRatio = input.speechBandRatio ?? 1;
  // Real speech modulates and concentrates energy in voice bands.
  // Steady hum / broadband TV noise usually fails one of these.
  return (
    modulation >= input.minModulation &&
    speechBandRatio >= input.minSpeechBandRatio
  );
}

/** Std-dev of recent levels — speech varies; steady noise is flatter. */
export function levelModulation(levels: number[]): number {
  if (levels.length < 4) return 0;
  const mean = levels.reduce((a, b) => a + b, 0) / levels.length;
  const variance =
    levels.reduce((a, b) => a + (b - mean) * (b - mean), 0) / levels.length;
  return Math.sqrt(variance);
}

/**
 * Fraction of spectrum energy in approximate voice band.
 * Assumes getByteFrequencyData bins with fftSize 256 @ ~48kHz (~187Hz/bin).
 * Voice ~300Hz–3.4kHz → bins ~2–18.
 */
export function speechBandRatioFromSpectrum(
  bins: ArrayLike<number>,
  options?: { voiceStartBin?: number; voiceEndBin?: number }
): number {
  const start = options?.voiceStartBin ?? 2;
  const end = Math.min(
    options?.voiceEndBin ?? 18,
    bins.length - 1
  );
  let voice = 0;
  let total = 0;
  for (let i = 0; i < bins.length; i += 1) {
    const v = bins[i] ?? 0;
    total += v;
    if (i >= start && i <= end) voice += v;
  }
  if (total <= 1) return 0;
  return voice / total;
}

/** Ambient / cough / TV bleed — must not confirm barge-in or open a turn. */
export function looksLikeEnvironmentalAudio(input: {
  level: number;
  echoFloor: number;
  sustainedMs: number;
  modulation?: number;
  speechBandRatio?: number;
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
      // Listening: only locally confirmed intentional speech may open outbound.
      // Server VAD must not start a turn (outbound should be muted anyway).
      if (state === "listening") {
        if (event.source !== "local_energy") {
          return hold(
            state,
            event.type,
            "ignore_server_vad_while_listening_await_local_confirm"
          );
        }
        const to: TurnState = "user_speaking";
        return {
          ...base,
          to,
          event: event.type,
          reason: "member_turn_opened_after_intentional_speech_confirm",
          cancelForge: false,
          openOutboundMic: true,
          ignoreServerSpeechAsBargeIn: false,
        };
      }
      if (state === "interrupted") {
        const to: TurnState = "user_speaking";
        return {
          ...base,
          to,
          event: event.type,
          reason: `member_turn_continued_via_${event.source}`,
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
