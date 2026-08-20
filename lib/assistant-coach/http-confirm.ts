/**
 * POST /api/assistant-coach/confirm — member confirms understanding, returns Forge href.
 */
import {
  applyConfirmationToLivingProfile,
  buildConfirmationView,
  buildFirstPracticeHref,
  type ConfirmationFields,
} from "./confirmation.ts";
import { SESSION_NO_STORE_HEADERS } from "./http-session.ts";
import type { LivingProfile } from "../system1/types.ts";

export type ConfirmRouteDeps = {
  resolveAuthUserId: (request: Request) => Promise<string | null>;
  loadProfile: (userId: string) => Promise<LivingProfile | null>;
  saveConfirmedProfile: (profile: LivingProfile) => Promise<LivingProfile>;
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

function readFields(body: unknown): ConfirmationFields | null {
  if (!body || typeof body !== "object") return null;
  const o = body as Record<string, unknown>;
  const str = (k: string) =>
    typeof o[k] === "string" ? o[k].trim().slice(0, 400) : "";
  return {
    workingOn: str("workingOn"),
    difficulty: str("difficulty"),
    identifiedMoment: str("identifiedMoment"),
    firstWork: str("firstWork"),
  };
}

export async function handleAssistantCoachConfirmRequest(
  request: Request,
  deps: ConfirmRouteDeps
): Promise<Response> {
  try {
    if (request.method !== "POST") {
      return jsonResponse(405, { error: "Method not allowed." });
    }
    const userId = await deps.resolveAuthUserId(request);
    if (!userId) {
      return jsonResponse(401, {
        error: "Sign in required.",
        code: "auth_required",
      });
    }

    const fields = readFields(await request.json().catch(() => null));
    if (!fields) {
      return jsonResponse(400, { error: "Confirmation fields are required." });
    }
    if (!fields.workingOn && !fields.difficulty && !fields.identifiedMoment) {
      return jsonResponse(400, {
        error: "Tell us what you’re working on, or the moment that gets hard.",
      });
    }

    const current = await deps.loadProfile(userId);
    if (!current) {
      return jsonResponse(404, {
        error: "Living Profile was not found.",
        code: "profile_missing",
      });
    }

    const purposeBefore = current.purposeStatement;
    const next = applyConfirmationToLivingProfile(current, fields);
    next.purposeStatement = purposeBefore;
    const saved = await deps.saveConfirmedProfile(next);
    const confirmation = buildConfirmationView(saved);
    const practiceHref = buildFirstPracticeHref(fields);

    return jsonResponse(200, {
      confirmation,
      practiceHref,
    });
  } catch (err) {
    console.error("assistant-coach confirm failed", err);
    return jsonResponse(500, {
      error: "Unable to save this confirmation.",
    });
  }
}
