import {
  hashAnonSecret,
} from "../assistant-coach/anon-secret.ts";
import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
  parseAnonCookieValue,
  readCookieFromHeader,
} from "../assistant-coach/anon-cookie.ts";
import {
  isAnonSessionExpired,
  type AssistantCoachSession,
  type AssistantCoachSessionRepository,
} from "../assistant-coach/session-repository.ts";
import { GuestForgePreviewError } from "./guest-preview.ts";

export const GUEST_PREVIEW_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Vary: "Cookie, Origin",
} as const;

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  let expected: string;
  try {
    expected = new URL(request.url).origin;
  } catch {
    throw new GuestForgePreviewError(
      "invalid_payload",
      "Request URL is invalid.",
      400
    );
  }
  if (!origin || origin !== expected) {
    throw new GuestForgePreviewError(
      "reconnect_denied",
      "Same-origin request required.",
      403
    );
  }
}

export async function resolveGuestPreviewSession(input: {
  request: Request;
  repository: AssistantCoachSessionRepository;
  cookieSecret: string;
  now?: Date;
}): Promise<AssistantCoachSession> {
  const rawCookie = readCookieFromHeader(
    input.request.headers.get("cookie"),
    ASSISTANT_COACH_ANON_COOKIE_NAME
  );
  const parsed = parseAnonCookieValue(rawCookie, input.cookieSecret);
  if (!parsed.ok) {
    throw new GuestForgePreviewError(
      "session_invalid",
      "A valid preview cookie is required.",
      401
    );
  }
  const session = await input.repository.getSessionByAnonKeyHash(
    hashAnonSecret(parsed.rawSecret)
  );
  const now = input.now ?? new Date();
  if (!session || session.userId != null || isAnonSessionExpired(session, now)) {
    if (session) await input.repository.markExpiredIfPast(session.id, now);
    throw new GuestForgePreviewError(
      "session_invalid",
      "The preview session is unavailable or expired.",
      401
    );
  }
  return session;
}

export function guestPreviewJson(
  status: number,
  body: Record<string, unknown>,
  setCookie?: string
): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    ...GUEST_PREVIEW_NO_STORE_HEADERS,
  });
  if (setCookie) headers.append("set-cookie", setCookie);
  return new Response(JSON.stringify(body), { status, headers });
}

export function guestPreviewErrorResponse(error: unknown): Response {
  if (error instanceof GuestForgePreviewError) {
    return guestPreviewJson(error.status, {
      error: error.message,
      code: error.code,
    });
  }
  console.error("[guest-forge-preview]", error);
  return guestPreviewJson(500, {
    error: "Guest Forge preview is temporarily unavailable.",
  });
}
