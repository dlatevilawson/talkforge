import type { ForgeEvent } from "@/lib/types";

/** OpenAI Realtime model for CE-M1+. */
export const CE_REALTIME_MODEL = "gpt-realtime-2.1";

/** Default voice for interviewer NPC. */
export const CE_REALTIME_VOICE = "marin";

/** Input transcription model (CE-M2 evidence substrate). */
export const CE_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";

export type CeTrack = ForgeEvent["track"] | "hello";

/**
 * NPC interviewer instructions for Realtime session.
 * Never coaches in voice — Forge coach is separate (CE-M3).
 */
export function buildNpcInstructions(input?: {
  track?: CeTrack;
  eventTitle?: string;
  successCriteria?: string;
}): string {
  const track = input?.track ?? "system_design";
  const eventLine = input?.eventTitle
    ? `The candidate is preparing for: ${input.eventTitle}.`
    : "The candidate is preparing for a high-stakes technical interview.";
  const successLine = input?.successCriteria
    ? `They said success looks like: ${input.successCriteria}`
    : "";

  const trackHint =
    track === "behavioral_tech"
      ? "You may ask behavioral / ownership questions."
      : track === "coding_interview"
        ? "You may ask them to talk through an approach before coding."
        : track === "hello"
          ? "This is a connection / transcript test. Keep turns short."
          : "You may open a light system-design style prompt after greeting.";

  return [
    "You are the interviewer in TalkForge, a communication practice gym.",
    "Role: realistic technical interviewer (NPC). You are NOT the coach.",
    "Never give coaching advice, scores, or identity labels in your speech.",
    "Never speak for the candidate. Keep turns short and natural.",
    eventLine,
    successLine,
    trackHint,
    "When the session begins, speak first: greet the candidate briefly,",
    "state that this is practice, and ask one opening question.",
    "Sound calm, professional, and human — not theatrical.",
  ]
    .filter(Boolean)
    .join(" ");
}

/** Body for POST /v1/realtime/client_secrets — includes CE-M2 input transcription. */
export function buildClientSecretRequest(input?: {
  track?: CeTrack;
  eventTitle?: string;
  successCriteria?: string;
}) {
  return {
    session: {
      type: "realtime" as const,
      model: CE_REALTIME_MODEL,
      instructions: buildNpcInstructions(input),
      audio: {
        input: {
          transcription: {
            model: CE_TRANSCRIBE_MODEL,
            language: "en",
          },
        },
        output: {
          voice: CE_REALTIME_VOICE,
        },
      },
    },
  };
}

/** session.update payload to reinforce transcription after connect. */
export function buildSessionUpdateForTranscription() {
  return {
    type: "session.update" as const,
    session: {
      type: "realtime" as const,
      audio: {
        input: {
          transcription: {
            model: CE_TRANSCRIBE_MODEL,
            language: "en",
          },
        },
      },
    },
  };
}
