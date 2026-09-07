import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
  parseAnonCookieValue,
  readCookieFromHeader,
} from "../assistant-coach/anon-cookie.ts";
import { hashAnonSecret } from "../assistant-coach/anon-secret.ts";
import type { AssistantCoachSessionRepository } from "../assistant-coach/session-repository.ts";
import {
  assertSameOrigin,
  guestPreviewErrorResponse,
  guestPreviewJson,
} from "./guest-preview-http.ts";
import {
  claimGuestForgePreview,
  GuestPreviewClaimError,
} from "./preview-claim.ts";

export type GuestPreviewClaimRouteDeps = {
  adminConfigured: () => boolean;
  requireCookieSecret: () => string;
  createRepository: () => AssistantCoachSessionRepository;
  resolveAuthUserId: () => Promise<string | null>;
};

export async function handleGuestPreviewClaimRequest(
  request: Request,
  deps: GuestPreviewClaimRouteDeps
): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return guestPreviewJson(405, { error: "Method not allowed." });
    }
    assertSameOrigin(request);
    if (!deps.adminConfigured()) {
      return guestPreviewJson(503, { error: "Preview claim is unavailable." });
    }
    const userId = await deps.resolveAuthUserId();
    if (!userId) {
      return guestPreviewJson(401, {
        error: "Sign in required.",
        code: "auth_required",
      });
    }
    const body = (await request.json()) as { topic?: unknown };
    const rawCookie = readCookieFromHeader(
      request.headers.get("cookie"),
      ASSISTANT_COACH_ANON_COOKIE_NAME
    );
    const parsed = parseAnonCookieValue(rawCookie, deps.requireCookieSecret());
    const result = await claimGuestForgePreview({
      repository: deps.createRepository(),
      anonKeyHash: parsed.ok ? hashAnonSecret(parsed.rawSecret) : null,
      userId,
      expectedTopicId: typeof body.topic === "string" ? body.topic : "",
    });
    return guestPreviewJson(200, {
      claim: {
        sessionId: result.session.id,
        status: result.session.status,
        topic: result.topicId,
        transcriptTurnCount: result.transcript.length,
        alreadyClaimed: result.alreadyClaimed,
      },
    });
  } catch (error) {
    if (error instanceof GuestPreviewClaimError) {
      return guestPreviewJson(error.status, {
        error: error.message,
        code: error.code,
      });
    }
    if (
      error instanceof Error &&
      error.name === "GuestForgePreviewError"
    ) {
      return guestPreviewErrorResponse(error);
    }
    console.error("[guest-forge-preview-claim]", error);
    return guestPreviewJson(500, {
      error: "Unable to save this Forge preview right now.",
    });
  }
}
