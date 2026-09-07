import {
  requireAssistantCoachAnonCookieSecret,
} from "@/lib/assistant-coach/config";
import { createSupabaseAssistantCoachSessionRepository } from "@/lib/assistant-coach/supabase-session-repository";
import {
  persistGuestForgeTranscript,
  type GuestTranscriptTurn,
} from "@/lib/forge/guest-preview";
import {
  assertSameOrigin,
  guestPreviewErrorResponse,
  guestPreviewJson,
  resolveGuestPreviewSession,
} from "@/lib/forge/guest-preview-http";
import { adminConfigured } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    if (!adminConfigured()) {
      return guestPreviewJson(503, { error: "Preview store unavailable." });
    }
    const body = (await request.json()) as {
      topic?: unknown;
      reconnectToken?: unknown;
      version?: unknown;
      replayId?: unknown;
      turns?: unknown;
    };
    const repository = createSupabaseAssistantCoachSessionRepository();
    const session = await resolveGuestPreviewSession({
      request,
      repository,
      cookieSecret: requireAssistantCoachAnonCookieSecret(),
    });
    const preview = await persistGuestForgeTranscript({
      repository,
      session,
      topicId: typeof body.topic === "string" ? body.topic : "",
      reconnectToken:
        typeof body.reconnectToken === "string" ? body.reconnectToken : "",
      expectedVersion:
        typeof body.version === "number" ? body.version : Number.NaN,
      replayId: typeof body.replayId === "string" ? body.replayId : "",
      turns: Array.isArray(body.turns)
        ? (body.turns as GuestTranscriptTurn[])
        : [],
    });
    return guestPreviewJson(200, { preview });
  } catch (error) {
    return guestPreviewErrorResponse(error);
  }
}
