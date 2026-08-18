/**
 * Phase 4B.3 — HTTP session mint/restore handler (no Next.js import).
 * Wired by app/api/assistant-coach/session/route.ts
 */
import { AssistantCoachConfigError } from "./config.ts";
import {
  serializeAnonSetCookie,
} from "./anon-cookie.ts";
import {
  AnonMintKeyError,
  ensureAnonAssistantCoachSession,
} from "./session-service.ts";
import type { AssistantCoachSessionRepository } from "./session-repository.ts";
import { buildGateFlags } from "./gate-flags.ts";
import { getAssistantCoachAnonTurnCap } from "./config.ts";

export const SESSION_NO_STORE_HEADERS = {
  "Cache-Control": "private, no-store, max-age=0, must-revalidate",
  Pragma: "no-cache",
  Vary: "Cookie, Idempotency-Key",
} as const;

export type SessionRouteDeps = {
  adminConfigured: () => boolean;
  requireCookieSecret: () => string;
  createRepository: () => AssistantCoachSessionRepository;
};

export function readMintKeyFromRequest(request: Request): string | null {
  return (
    request.headers.get("idempotency-key")?.trim() ||
    request.headers.get("x-ac-mint-key")?.trim() ||
    null
  );
}

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  setCookie?: string
): Response {
  const headers = new Headers({
    "content-type": "application/json; charset=utf-8",
    ...SESSION_NO_STORE_HEADERS,
  });
  if (setCookie) {
    headers.append("set-cookie", setCookie);
  }
  return new Response(JSON.stringify(body), { status, headers });
}

export async function handleAssistantCoachSessionRequest(
  request: Request,
  deps: SessionRouteDeps
): Promise<Response> {
  try {
    if (!deps.adminConfigured()) {
      return jsonResponse(503, {
        error: "Assistant Coach session store is not configured.",
      });
    }

    let cookieSecret: string;
    try {
      cookieSecret = deps.requireCookieSecret();
    } catch (err) {
      if (err instanceof AssistantCoachConfigError) {
        return jsonResponse(503, { error: err.message });
      }
      throw err;
    }

    const mintKey = readMintKeyFromRequest(request);
    const repository = deps.createRepository();

    let result;
    try {
      result = await ensureAnonAssistantCoachSession({
        repository,
        cookieSecret,
        cookieHeader: request.headers.get("cookie"),
        mintKey,
        requireMintKeyForMint: true,
      });
    } catch (err) {
      if (err instanceof AnonMintKeyError) {
        return jsonResponse(400, {
          error: err.message,
          hint: "Send Idempotency-Key (43–128 URL-safe chars) when minting.",
        });
      }
      throw err;
    }

    const setCookie = serializeAnonSetCookie(
      result.sealedCookie,
      result.cookieAttributes
    );
    const messages = await repository.listMessages(result.session.id);
    return jsonResponse(
      200,
      {
        session: result.publicSession,
        messages: messages.map((m) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          turnIndex: m.turnIndex,
          createdAt: m.createdAt,
        })),
        gate: buildGateFlags(result.session, {
          turnCap: getAssistantCoachAnonTurnCap(),
          isAnonymous: result.session.userId == null,
        }),
      },
      setCookie
    );
  } catch (err) {
    console.error("assistant-coach session mint/restore failed", err);
    return jsonResponse(500, {
      error: "Unable to establish Assistant Coach session.",
    });
  }
}
