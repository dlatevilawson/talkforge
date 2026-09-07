/**
 * Public Coach wizard profile handler.
 *
 * Verifies the signed anonymous session, validates the member declaration,
 * and writes only the verified practice-profile field inside the existing
 * provisional draft.
 */
import { hashAnonSecret } from "./anon-secret.ts";
import {
  ASSISTANT_COACH_ANON_COOKIE_NAME,
  parseAnonCookieValue,
  readCookieFromHeader,
} from "./anon-cookie.ts";
import { AssistantCoachConfigError } from "./config.ts";
import { SESSION_NO_STORE_HEADERS } from "./http-session.ts";
import {
  PracticeProfileValidationError,
  createVerifiedMemberPracticeProfile,
  parseMemberPracticeProfile,
  projectMemberPracticeProfile,
  validateMemberPracticeProfileSelection,
} from "./practice-profile.ts";
import { AssistantCoachClaimError } from "./claim-merge.ts";
import {
  AssistantCoachDraftConflictError,
  isAnonSessionExpired,
  type AssistantCoachSessionRepository,
} from "./session-repository.ts";

export type ProfileRouteDeps = {
  adminConfigured: () => boolean;
  requireCookieSecret: () => string;
  createRepository: () => AssistantCoachSessionRepository;
  resolveAuthUserId?: () => Promise<string | null>;
  activateAuthenticated?: (input: {
    anonKeyHash: string;
    userId: string;
  }) => Promise<{ destination: string }>;
  now?: () => Date;
};

function jsonResponse(
  status: number,
  body: Record<string, unknown>,
  clearAnonCookie = false
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      ...SESSION_NO_STORE_HEADERS,
      ...(clearAnonCookie
        ? {
            "set-cookie": `${ASSISTANT_COACH_ANON_COOKIE_NAME}=; Path=/; Max-Age=0; SameSite=Lax; HttpOnly`,
          }
        : {}),
    },
  });
}

export async function handleAssistantCoachProfileRequest(
  request: Request,
  deps: ProfileRouteDeps
): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed." });
    }
    if (!deps.adminConfigured()) {
      return jsonResponse(503, {
        error: "Coach profile storage is not configured.",
      });
    }

    const cookieSecret = deps.requireCookieSecret();
    const rawCookie = readCookieFromHeader(
      request.headers.get("cookie"),
      ASSISTANT_COACH_ANON_COOKIE_NAME
    );
    const parsed = parseAnonCookieValue(rawCookie, cookieSecret);
    if (!parsed.ok) {
      return jsonResponse(401, {
        error: "A valid Coach session is required.",
        code: "session_required",
      });
    }

    const repository = deps.createRepository();
    const session = await repository.getSessionByAnonKeyHash(
      hashAnonSecret(parsed.rawSecret)
    );
    if (!session) {
      return jsonResponse(401, {
        error: "Coach session was not found.",
        code: "session_unknown",
      });
    }

    const now = deps.now?.() ?? new Date();
    if (isAnonSessionExpired(session, now)) {
      await repository.markExpiredIfPast(session.id, now);
      return jsonResponse(410, {
        error: "This Coach session has expired.",
        code: "session_expired",
      });
    }

    const draft = await repository.getDraft(session.id);
    if (!draft) {
      return jsonResponse(409, {
        error: "Coach profile draft was not found.",
        code: "draft_missing",
      });
    }

    const body = await request.json().catch(() => null);
    const selection =
      body && typeof body === "object" && !Array.isArray(body)
        ? (body as Record<string, unknown>).selection
        : null;
    const validatedSelection =
      validateMemberPracticeProfileSelection(selection);
    const profile = createVerifiedMemberPracticeProfile({
      selection: validatedSelection,
      sourceSessionId: session.id,
      now,
    });
    const projection = projectMemberPracticeProfile(validatedSelection);

    const existing = parseMemberPracticeProfile(
      draft.profileJson.memberPracticeProfile
    );
    const sameSelection =
      existing &&
      JSON.stringify({
        topics: existing.topics,
        audiences: existing.audiences,
        pattern: existing.pattern,
        urgency: existing.urgency,
      }) === JSON.stringify(validatedSelection);
    const savedProfile = sameSelection ? existing : profile;
    if (!sameSelection) {
      await repository.saveDraft({
        sessionId: session.id,
        version: draft.version + 1,
        expectedVersion: draft.version,
        profileJson: {
          ...draft.profileJson,
          memberPracticeProfile: profile,
        },
        updatedAt: now.toISOString(),
      });
    }

    const userId = await deps.resolveAuthUserId?.();
    if (userId && deps.activateAuthenticated) {
      const activated = await deps.activateAuthenticated({
        anonKeyHash: hashAnonSecret(parsed.rawSecret),
        userId,
      });
      return jsonResponse(
        200,
        { profile: savedProfile, projection, destination: activated.destination },
        true
      );
    }

    return jsonResponse(200, { profile: savedProfile, projection });
  } catch (err) {
    if (err instanceof AssistantCoachConfigError) {
      return jsonResponse(503, { error: err.message });
    }
    if (err instanceof PracticeProfileValidationError) {
      return jsonResponse(400, {
        error: err.message,
        code: "invalid_selection",
      });
    }
    if (err instanceof AssistantCoachDraftConflictError) {
      return jsonResponse(409, {
        error: "Coach profile changed. Try again.",
        code: "draft_conflict",
      });
    }
    if (err instanceof AssistantCoachClaimError) {
      return jsonResponse(err.status, { error: err.message, code: err.code });
    }
    console.error("assistant-coach profile save failed", err);
    return jsonResponse(500, {
      error: "Unable to save your Coach profile.",
    });
  }
}
