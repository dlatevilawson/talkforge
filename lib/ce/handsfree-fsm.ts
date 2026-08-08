/**
 * Pro Hands-Free session state machine (CE voice).
 * Free Touch+Talk does not use this FSM for mic control.
 */

export type HandsFreeState =
  | "idle"
  | "listening"
  | "user_speaking"
  | "processing"
  | "forge_speaking"
  | "waiting_for_user"
  | "paused"
  | "ending";

export type HandsFreeEvent =
  | { type: "SESSION_READY" }
  | { type: "USER_SPEECH_STARTED" }
  | { type: "USER_SPEECH_STOPPED" }
  | { type: "FORGE_RESPONSE_STARTED" }
  | { type: "FORGE_RESPONSE_DONE" }
  | { type: "BARGE_IN" }
  | { type: "LONG_SILENCE" }
  | { type: "USER_RESUMED" }
  | { type: "END" };

export function reduceHandsFreeState(
  state: HandsFreeState,
  event: HandsFreeEvent
): HandsFreeState {
  switch (event.type) {
    case "SESSION_READY":
      return state === "idle" || state === "ending" ? "listening" : state;
    case "USER_SPEECH_STARTED":
      if (state === "forge_speaking") return "user_speaking"; // barge-in
      if (
        state === "listening" ||
        state === "waiting_for_user" ||
        state === "paused" ||
        state === "processing"
      ) {
        return "user_speaking";
      }
      return state;
    case "USER_SPEECH_STOPPED":
      return state === "user_speaking" ? "processing" : state;
    case "FORGE_RESPONSE_STARTED":
      return state === "ending" ? state : "forge_speaking";
    case "FORGE_RESPONSE_DONE":
      return state === "ending" ? state : "listening";
    case "BARGE_IN":
      return "user_speaking";
    case "LONG_SILENCE":
      if (
        state === "listening" ||
        state === "waiting_for_user" ||
        state === "processing"
      ) {
        return "paused";
      }
      return state;
    case "USER_RESUMED":
      return state === "paused" ? "user_speaking" : state;
    case "END":
      return "ending";
    default:
      return state;
  }
}

/** Ring / chrome label for hands-free FSM (single line, no duplicates). */
export function handsFreeStateLabel(state: HandsFreeState): string | undefined {
  switch (state) {
    case "listening":
    case "waiting_for_user":
      return "Speak naturally";
    case "user_speaking":
      return "Listening";
    case "processing":
      return "Thinking";
    case "forge_speaking":
      return "Forge speaking";
    case "paused":
      return "Paused — speak to continue";
    case "ending":
      return "Rep Complete";
    default:
      return undefined;
  }
}
