import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";
import { evaluatePracticeEntitlement } from "@/lib/billing/entitlements";
import { resolveVoiceUsageStartCapability } from "@/lib/ce/voice-mode";
import {
  completeVoiceUsage,
  recordVoiceUsageEvent,
  startVoiceUsage,
} from "@/lib/ce/voice-usage-server";

export const runtime = "nodejs";

type Body = {
  action?: "start" | "event" | "complete";
  usageId?: string;
  practiceSessionId?: string | null;
  realtimeSessionId?: string | null;
  voiceMode?: "hold" | "handsfree";
  model?: string;
  event?: "assistant_turn" | "user_speech" | "barge_in" | "assistant_text";
  text?: string;
  estimatedInputTokens?: number;
};

/**
 * Server-authoritative voice usage tracking.
 * Never returns member-facing meters — only internal economics advice for caps.
 */
export async function POST(req: Request) {
  const gate = await requireApiUser();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let body: Body = {};
  try {
    body = (await req.json()) as Body;
  } catch {
    body = {};
  }

  const action = body.action;
  if (action === "start") {
    const entitlement = await evaluatePracticeEntitlement(gate.userId);
    const capability = resolveVoiceUsageStartCapability({
      requestedVoiceMode:
        body.voiceMode === "handsfree" ? "handsfree" : "hold",
      entitlement,
    });
    // Server entitlement is authoritative. Never trust client plan claims.
    if (!capability.allowed) {
      return NextResponse.json(
        { error: "Hands-free requires Pro." },
        { status: 403 }
      );
    }
    const started = await startVoiceUsage({
      userId: gate.userId,
      practiceSessionId: body.practiceSessionId,
      realtimeSessionId: body.realtimeSessionId,
      plan: capability.plan,
      voiceMode: capability.voiceMode,
      model: body.model,
    });
    return NextResponse.json({ usageId: started?.id ?? null });
  }

  if (action === "event") {
    if (!body.usageId || !body.event) {
      return NextResponse.json(
        { error: "usageId and event required." },
        { status: 400 }
      );
    }
    const result = await recordVoiceUsageEvent({
      usageId: body.usageId,
      userId: gate.userId,
      event: body.event,
      text: body.text,
      estimatedInputTokens: body.estimatedInputTokens,
    });
    return NextResponse.json({
      advice: result?.advice ?? null,
      // Do not expose raw token counters to the client UI — only control knobs.
      maxOutputTokens: result?.advice.nextMaxOutputTokens ?? null,
      conciseMode: result?.advice.conciseMode ?? false,
    });
  }

  if (action === "complete") {
    if (!body.usageId) {
      return NextResponse.json({ error: "usageId required." }, { status: 400 });
    }
    await completeVoiceUsage({
      usageId: body.usageId,
      userId: gate.userId,
      practiceSessionId: body.practiceSessionId,
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
