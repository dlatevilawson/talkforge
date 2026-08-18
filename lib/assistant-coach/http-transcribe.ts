/**
 * Server-mediated speech-to-text for public /coach.
 * Requires a valid anon AC cookie. Never exposes OPENAI_API_KEY.
 */
import OpenAI, { toFile } from "openai";
import {
  checkRateLimit,
  clientKeyFromHeaders,
} from "../auth/rate-limit.ts";
import { AssistantCoachConfigError } from "./config.ts";
import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
  parseAnonCookieValue,
  readCookieFromHeader,
} from "./anon-cookie.ts";
import { hashAnonSecret } from "./anon-secret.ts";
import {
  isAnonSessionExpired,
  type AssistantCoachSessionRepository,
} from "./session-repository.ts";
import { SESSION_NO_STORE_HEADERS } from "./http-session.ts";
import { AssistantCoachTurnError } from "./turn-runtime.ts";
import { buildGateFlags } from "./gate-flags.ts";
import { getAssistantCoachAnonTurnCap } from "./config.ts";

export const ASSISTANT_COACH_TRANSCRIBE_MAX_BYTES = 4 * 1024 * 1024;
export const ASSISTANT_COACH_TRANSCRIBE_MODEL = "gpt-4o-mini-transcribe";

export type TranscribeRouteDeps = {
  adminConfigured: () => boolean;
  requireCookieSecret: () => string;
  createRepository: () => AssistantCoachSessionRepository;
  /** Injectable for tests. */
  transcribeAudio?: (file: File) => Promise<string>;
  rateLimit?: typeof checkRateLimit;
  maxBytes?: number;
};

function jsonResponse(
  status: number,
  body: Record<string, unknown>
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...SESSION_NO_STORE_HEADERS,
    },
  });
}

async function defaultTranscribe(file: File): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "Assistant Coach transcription unavailable: OPENAI_API_KEY is not configured"
    );
    throw new AssistantCoachConfigError(
      "Assistant Coach model is not configured."
    );
  }
  const client = new OpenAI({ apiKey });
  const upload = await toFile(file, file.name || "coach-audio.webm", {
    type: file.type || "audio/webm",
  });
  const result = await client.audio.transcriptions.create({
    file: upload,
    model: ASSISTANT_COACH_TRANSCRIBE_MODEL,
  });
  return typeof result.text === "string" ? result.text.trim() : "";
}

async function requireAnonSession(
  request: Request,
  deps: TranscribeRouteDeps
) {
  const cookieSecret = deps.requireCookieSecret();
  const repository = deps.createRepository();
  const raw = readCookieFromHeader(
    request.headers.get("cookie"),
    ASSISTANT_COACH_ANON_COOKIE_NAME
  );
  const parsed = parseAnonCookieValue(raw, cookieSecret);
  if (!parsed.ok) {
    throw new AssistantCoachTurnError(
      "session_required",
      "A valid Coach session is required.",
      401
    );
  }
  const session = await repository.getSessionByAnonKeyHash(
    hashAnonSecret(parsed.rawSecret)
  );
  if (!session) {
    throw new AssistantCoachTurnError(
      "session_unknown",
      "Coach session was not found.",
      401
    );
  }
  if (isAnonSessionExpired(session)) {
    await repository.markExpiredIfPast(session.id);
    throw new AssistantCoachTurnError(
      "session_expired",
      "This Coach session has expired.",
      410
    );
  }
  return { session, repository };
}

export async function handleAssistantCoachTranscribeRequest(
  request: Request,
  deps: TranscribeRouteDeps
): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed." });
    }
    if (!deps.adminConfigured()) {
      return jsonResponse(503, {
        error: "Assistant Coach session store is not configured.",
      });
    }

    const { session } = await requireAnonSession(request, deps);
    const turnCap = getAssistantCoachAnonTurnCap();
    const gate = buildGateFlags(session, {
      turnCap,
      isAnonymous: session.userId == null,
    });
    if (gate.mustAuthenticateToContinue) {
      return jsonResponse(403, {
        error: "Create an account to continue.",
        code: "must_authenticate",
        gate,
        session: {
          id: session.id,
          status: session.status,
          expiresAt: session.expiresAt,
          turnCount: session.turnCount,
          hasExperiencedValue: session.hasExperiencedValue,
        },
      });
    }

    const rateLimit = deps.rateLimit ?? checkRateLimit;
    const ip = clientKeyFromHeaders(request.headers);
    const sessionBucket = rateLimit(
      `ac-transcribe:session:${session.id}`,
      20,
      60_000
    );
    if (!sessionBucket.ok) {
      return jsonResponse(429, {
        error: "Too many recordings. Please wait a moment.",
        retryAfterSec: sessionBucket.retryAfterSec,
      });
    }
    const ipBucket = rateLimit(`ac-transcribe:ip:${ip}`, 30, 60_000);
    if (!ipBucket.ok) {
      return jsonResponse(429, {
        error: "Too many recordings. Please wait a moment.",
        retryAfterSec: ipBucket.retryAfterSec,
      });
    }

    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonResponse(400, { error: "Expected multipart form data." });
    }
    const audio = form.get("audio");
    if (!(audio instanceof File) || audio.size === 0) {
      return jsonResponse(400, { error: "Audio recording is required." });
    }
    const maxBytes = deps.maxBytes ?? ASSISTANT_COACH_TRANSCRIBE_MAX_BYTES;
    if (audio.size > maxBytes) {
      return jsonResponse(413, { error: "Recording is too large." });
    }

    const transcribe = deps.transcribeAudio ?? defaultTranscribe;
    const text = await transcribe(audio);
    if (!text) {
      return jsonResponse(422, {
        error: "Could not understand that recording. Try again.",
      });
    }
    return jsonResponse(200, { text });
  } catch (err) {
    if (err instanceof AssistantCoachConfigError) {
      return jsonResponse(503, { error: err.message });
    }
    if (err instanceof AssistantCoachTurnError) {
      return jsonResponse(err.status, {
        error: err.message,
        code: err.code,
      });
    }
    console.error("assistant-coach transcribe failed", err);
    return jsonResponse(500, {
      error: "Unable to transcribe recording.",
    });
  }
}
