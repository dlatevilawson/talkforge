import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";
import { evaluatePracticeEntitlement } from "@/lib/billing/entitlements";
import { loadCoachPromptContextForUser } from "@/lib/coach/memory-server";
import {
  buildClientSecretRequest,
  type CeSessionMode,
  type CeTrack,
} from "@/lib/ce/session-config";
import { resolveArenaVoiceMode } from "@/lib/ce/voice-mode";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { AC_HANDOFF_SOURCE } from "@/lib/assistant-coach/confirmation";
import { evaluatePracticeRouteAccess } from "@/lib/system2/server-readiness";

export const runtime = "nodejs";

type SessionBody = {
  track?: CeTrack;
  eventTitle?: string;
  successCriteria?: string;
  mode?: CeSessionMode | string;
  source?: string;
};

/**
 * CE-M1: Mint an ephemeral OpenAI Realtime client secret.
 * Injects coach relationship memory so Forge welcomes returning members.
 * Billing SSOT gates starting practice (BILL-001) — never mid-session.
 */
export async function POST(req: Request) {
  const gate = await requireApiUser();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  // Same readiness boundary as /app/practice (BS-013).
  // AC first-practice handoff: confirmed moment is the starting context.
  const readiness = await evaluatePracticeRouteAccess();
  let body: SessionBody = {};
  try {
    const json = (await req.json()) as unknown;
    if (json && typeof json === "object") {
      body = json as SessionBody;
    }
  } catch {
    body = {};
  }
  const eventTitle =
    typeof body.eventTitle === "string" ? body.eventTitle.trim() : "";
  const acHandoff =
    body.source === AC_HANDOFF_SOURCE && eventTitle.length > 0;
  if (!readiness.allowed && !acHandoff) {
    return NextResponse.json(
      {
        error: "Living Profile readiness required before starting Coach Forge.",
        reason: readiness.reason,
      },
      { status: 403 }
    );
  }

  // BILL-001 / BS-016 — server entitlement before mint (start only).
  const supabase = await createServerSupabaseClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", gate.userId)
    .maybeSingle();
  const entitlement = await evaluatePracticeEntitlement(
    gate.userId,
    typeof profile?.role === "string" ? profile.role : null
  );
  if (!entitlement.canStartPractice) {
    return NextResponse.json(
      {
        error:
          entitlement.message ??
          "You’ve completed your complimentary coaching sessions. Whenever you’re ready, Forge will be here.",
        code: "PRACTICE_LIMIT_REACHED",
        reason: entitlement.reason,
        membershipPath: "/membership",
        billingPath: "/app/billing",
      },
      { status: 403 }
    );
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      {
        error:
          "OPENAI_API_KEY is not configured. Cannot mint Realtime session.",
      },
      { status: 503 }
    );
  }

  const track = normalizeTrack(body.track);
  const mode: CeSessionMode =
    body.mode === "assessment" ? "assessment" : "practice";
  const memory = await loadCoachPromptContextForUser(gate.userId);
  const planIsPro =
    entitlement.plan === "pro" ||
    entitlement.reason === "pro" ||
    entitlement.reason === "staff";
  // Hands-free is gated off until speakerphone yield is certified.
  // Pro members still get Pro entitlement — mic UX is hold-to-talk for all.
  const voiceMode = resolveArenaVoiceMode({ planIsPro });
  const handsFree = voiceMode === "handsfree";
  const payload = buildClientSecretRequest({
    track,
    eventTitle: eventTitle || undefined,
    successCriteria:
      typeof body.successCriteria === "string"
        ? body.successCriteria
        : undefined,
    memory,
    handsFree,
    mode,
  });

  try {
    const response = await fetch(
      "https://api.openai.com/v1/realtime/client_secrets",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      }
    );

    const data = (await response.json()) as {
      value?: string;
      expires_at?: number;
      session?: { id?: string; model?: string };
      error?: { message?: string };
    };

    if (!response.ok || !data.value) {
      return NextResponse.json(
        {
          error:
            data.error?.message ??
            `Failed to mint Realtime client secret (${response.status}).`,
        },
        { status: response.status >= 400 ? response.status : 502 }
      );
    }

    return NextResponse.json({
      value: data.value,
      expires_at: data.expires_at,
      session_id: data.session?.id ?? null,
      model: data.session?.model ?? payload.session.model,
      track,
      mode,
      milestone: "CE-M1",
      voiceMode,
      entitlement: {
        plan: entitlement.plan,
        sessionsRemaining: entitlement.sessionsRemaining,
        sessionsLimit: entitlement.sessionsLimit,
      },
      memory: {
        firstName: memory.firstName,
        isReturning: memory.isReturning,
        sessionsCompleted: memory.sessionsCompleted,
        welcomeHint: memory.welcomeHint,
        adaptiveInsight: memory.adaptiveInsight,
        lastScenarioTitle: memory.lastScenarioTitle,
      },
    });
  } catch (error) {
    console.error("[CE-M1] client_secrets error", error);
    return NextResponse.json(
      { error: "Failed to reach OpenAI Realtime client_secrets." },
      { status: 502 }
    );
  }
}

function normalizeTrack(track: unknown): CeTrack {
  if (
    track === "system_design" ||
    track === "behavioral_tech" ||
    track === "coding_interview" ||
    track === "hello"
  ) {
    return track;
  }
  return "hello";
}
