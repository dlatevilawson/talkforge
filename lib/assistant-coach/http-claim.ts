/**
 * POST /api/assistant-coach/claim — attach anon session to authenticated member.
 */
import { hashAnonSecret } from "./anon-secret.ts";
import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
  parseAnonCookieValue,
  readCookieFromHeader,
} from "./anon-cookie.ts";
import { AssistantCoachConfigError } from "./config.ts";
import {
  AssistantCoachClaimError,
  claimAssistantCoachSession,
  type ClaimLivingProfileStore,
} from "./claim.ts";
import { buildConfirmationView } from "./confirmation.ts";
import { SESSION_NO_STORE_HEADERS } from "./http-session.ts";
import type { AssistantCoachSessionRepository } from "./session-repository.ts";

export type ClaimRouteDeps = {
  adminConfigured: () => boolean;
  requireCookieSecret: () => string;
  createRepository: () => AssistantCoachSessionRepository;
  resolveAuthUserId: (request: Request) => Promise<string | null>;
  createProfileStore: (userId: string) => ClaimLivingProfileStore;
};

function jsonResponse(status: number, body: Record<string, unknown>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...SESSION_NO_STORE_HEADERS,
    },
  });
}

export async function handleAssistantCoachClaimRequest(
  request: Request,
  deps: ClaimRouteDeps
): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed." });
    }
    if (!deps.adminConfigured()) {
      return jsonResponse(503, {
        error: "Assistant Coach claim is not configured.",
      });
    }

    const userId = await deps.resolveAuthUserId(request);
    if (!userId) {
      return jsonResponse(401, {
        error: "Sign in required.",
        code: "auth_required",
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

    const raw = readCookieFromHeader(
      request.headers.get("cookie"),
      ASSISTANT_COACH_ANON_COOKIE_NAME
    );
    const parsed = parseAnonCookieValue(raw, cookieSecret);
    const anonKeyHash = parsed.ok ? hashAnonSecret(parsed.rawSecret) : null;

    const repository = deps.createRepository();
    const result = await claimAssistantCoachSession({
      repository,
      anonKeyHash,
      userId,
      profiles: deps.createProfileStore(userId),
    });

    const confirmation = buildConfirmationView(result.draftProfile, {
      userMessages: result.userMessages,
    });
    return jsonResponse(200, {
      session: {
        id: result.session.id,
        status: result.session.status,
        hasExperiencedValue: result.session.hasExperiencedValue,
        claimedAt: result.session.claimedAt,
      },
      confirmation,
      alreadyClaimed: result.alreadyClaimed,
    });
  } catch (err) {
    if (err instanceof AssistantCoachClaimError) {
      return jsonResponse(err.status, { error: err.message, code: err.code });
    }
    console.error("assistant-coach claim failed", err);
    return jsonResponse(500, { error: "Unable to claim this Coach session." });
  }
}
