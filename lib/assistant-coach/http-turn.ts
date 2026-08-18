/**
 * Phase 4B.4 — HTTP turn handler (no Next.js import).
 * Wired by app/api/assistant-coach/turn/route.ts
 */
import {
  checkRateLimit,
  clientKeyFromHeaders,
} from "../auth/rate-limit.ts";
import { AssistantCoachConfigError } from "./config.ts";
import {
  hashAnonSecret,
} from "./anon-secret.ts";
import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
  parseAnonCookieValue,
  readCookieFromHeader,
} from "./anon-cookie.ts";
import { SESSION_NO_STORE_HEADERS } from "./http-session.ts";
import {
  AssistantCoachTurnError,
  runAssistantCoachTurn,
  type AssistantCoachModel,
  type RunAssistantCoachTurnResult,
} from "./turn-runtime.ts";
import {
  isAnonSessionExpired,
  type AssistantCoachSession,
  type AssistantCoachSessionRepository,
} from "./session-repository.ts";
import type { LivingProfile } from "../system1/types.ts";

export type TurnRouteDeps = {
  adminConfigured: () => boolean;
  requireCookieSecret: () => string;
  createRepository: () => AssistantCoachSessionRepository;
  createModel: () => AssistantCoachModel;
  /** Optional auth resolution — returns user id or null. */
  resolveAuthUserId?: (request: Request) => Promise<string | null>;
  /** Optional member Living Profile loader. */
  loadMemberProfile?: (userId: string) => Promise<LivingProfile | null>;
  /** Test overrides */
  rateLimit?: typeof checkRateLimit;
  turnLimitPerSession?: number;
  turnLimitPerIp?: number;
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

function publicSession(session: AssistantCoachSession) {
  return {
    id: session.id,
    status: session.status,
    expiresAt: session.expiresAt,
    turnCount: session.turnCount,
    hasExperiencedValue: session.hasExperiencedValue,
  };
}

function publicTurnBody(result: RunAssistantCoachTurnResult) {
  return {
    reply: result.reply,
    session: publicSession(result.session),
    gate: result.gate,
    idempotentReplay: result.idempotentReplay,
  };
}

async function resolveSessionFromCookie(
  request: Request,
  deps: TurnRouteDeps
): Promise<AssistantCoachSession> {
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
      "A valid Assistant Coach session cookie is required.",
      401
    );
  }
  const hash = hashAnonSecret(parsed.rawSecret);
  const session = await repository.getSessionByAnonKeyHash(hash);
  if (!session) {
    throw new AssistantCoachTurnError(
      "session_unknown",
      "Assistant Coach session was not found.",
      401
    );
  }
  if (isAnonSessionExpired(session)) {
    await repository.markExpiredIfPast(session.id);
    throw new AssistantCoachTurnError(
      "session_expired",
      "This Assistant Coach session has expired.",
      410
    );
  }
  return session;
}

export async function handleAssistantCoachTurnRequest(
  request: Request,
  deps: TurnRouteDeps
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

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return jsonResponse(400, { error: "Invalid JSON body." });
    }

    const message = typeof body.message === "string" ? body.message : "";
    const clientTurnId =
      typeof body.clientTurnId === "string" ? body.clientTurnId : null;

    const session = await resolveSessionFromCookie(request, deps);
    const repository = deps.createRepository();

    const rateLimit = deps.rateLimit ?? checkRateLimit;
    const sessionLimit = deps.turnLimitPerSession ?? 30;
    const ipLimit = deps.turnLimitPerIp ?? 60;
    const ip = clientKeyFromHeaders(request.headers);
    const sessionBucket = rateLimit(
      `ac-turn:session:${session.id}`,
      sessionLimit,
      60_000
    );
    if (!sessionBucket.ok) {
      return jsonResponse(429, {
        error: "Too many Assistant Coach turns. Please wait a moment.",
        retryAfterSec: sessionBucket.retryAfterSec,
      });
    }
    const ipBucket = rateLimit(`ac-turn:ip:${ip}`, ipLimit, 60_000);
    if (!ipBucket.ok) {
      return jsonResponse(429, {
        error: "Too many Assistant Coach turns. Please wait a moment.",
        retryAfterSec: ipBucket.retryAfterSec,
      });
    }

    const authUserId = deps.resolveAuthUserId
      ? await deps.resolveAuthUserId(request)
      : null;
    const memberProfile =
      authUserId && deps.loadMemberProfile
        ? await deps.loadMemberProfile(authUserId)
        : null;

    const result = await runAssistantCoachTurn({
      repository,
      session,
      message,
      clientTurnId,
      authUserId,
      memberProfile,
      model: deps.createModel(),
    });

    return jsonResponse(200, publicTurnBody(result));
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
    console.error("assistant-coach turn failed", err);
    return jsonResponse(500, {
      error: "Unable to complete Assistant Coach turn.",
    });
  }
}
