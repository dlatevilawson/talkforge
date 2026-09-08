import { createHash } from "node:crypto";
import {
  serializeAnonSetCookie,
} from "@/lib/assistant-coach/anon-cookie";
import {
  requireAssistantCoachAnonCookieSecret,
} from "@/lib/assistant-coach/config";
import { ensureAnonAssistantCoachSession } from "@/lib/assistant-coach/session-service";
import { createSupabaseAssistantCoachSessionRepository } from "@/lib/assistant-coach/supabase-session-repository";
import {
  bootstrapGuestForgePreview,
  readGuestForgeTranscriptForClaim,
} from "@/lib/forge/guest-preview";
import {
  assertSameOrigin,
  guestPreviewErrorResponse,
  guestPreviewJson,
} from "@/lib/forge/guest-preview-http";
import { adminConfigured } from "@/lib/supabase/admin";
import {
  checkRateLimit,
  clientKeyFromHeaders,
} from "@/lib/auth/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    assertSameOrigin(request);
    const ip = clientKeyFromHeaders(request.headers);
    const mintKey = request.headers.get("idempotency-key")?.trim() ?? "";
    const mintBucketKey = mintKey
      ? createHash("sha256").update(mintKey).digest("hex").slice(0, 24)
      : "missing";
    const ipRate = checkRateLimit(
      `guest-forge-bootstrap:ip:${ip}`,
      20,
      10 * 60_000
    );
    const mintRate = checkRateLimit(
      `guest-forge-bootstrap:mint:${mintBucketKey}`,
      4,
      10 * 60_000
    );
    if (!ipRate.ok || !mintRate.ok) {
      return guestPreviewJson(429, {
        error: "Too many preview setup requests. Try again later.",
        retryAfterSec: Math.max(ipRate.retryAfterSec, mintRate.retryAfterSec),
      });
    }
    if (!adminConfigured()) {
      return guestPreviewJson(503, {
        error: "Guest Forge preview store is not configured.",
      });
    }
    const body = (await request.json()) as { topic?: unknown };
    const topicId = typeof body.topic === "string" ? body.topic : "";
    const repository = createSupabaseAssistantCoachSessionRepository();
    const cookieSecret = requireAssistantCoachAnonCookieSecret();
    const ensured = await ensureAnonAssistantCoachSession({
      repository,
      cookieSecret,
      cookieHeader: request.headers.get("cookie"),
      mintKey,
      requireMintKeyForMint: true,
    });
    const preview = await bootstrapGuestForgePreview({
      repository,
      session: ensured.session,
      topicId,
    });
    const transcript = await readGuestForgeTranscriptForClaim(
      repository,
      ensured.session.id,
      preview.transcriptBaseIndex
    );
    return guestPreviewJson(
      200,
      {
        preview,
        transcript,
        sessionExpiresAt: ensured.session.expiresAt,
      },
      serializeAnonSetCookie(
        ensured.sealedCookie,
        ensured.cookieAttributes
      )
    );
  } catch (error) {
    return guestPreviewErrorResponse(error);
  }
}
