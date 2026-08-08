import "server-only";

import {
  adminConfigured,
  createAdminSupabaseClient,
} from "@/lib/supabase/admin";
import {
  adviseVoiceEconomics,
  estimateSessionCostUsd,
  estimateTokensFromText,
  type EconomicsAdvice,
  type SessionUsageSnapshot,
} from "@/lib/ce/voice-economics";
import { CE_REALTIME_MODEL } from "@/lib/ce/session-config";

export type VoiceUsageRow = {
  id: string;
  user_id: string;
  practice_session_id: string | null;
  realtime_session_id: string | null;
  plan: "free" | "pro";
  voice_mode: "hold" | "handsfree";
  model: string | null;
  started_at: string;
  ended_at: string | null;
  duration_seconds: number | null;
  assistant_turns: number;
  user_speech_events: number;
  barge_in_count: number;
  estimated_input_tokens: number;
  estimated_output_tokens: number;
  concise_mode_engaged: boolean;
  estimated_cost_usd: number | null;
};

function snapshotFromRow(row: VoiceUsageRow): SessionUsageSnapshot {
  return {
    assistantTurns: row.assistant_turns,
    estimatedOutputTokens: row.estimated_output_tokens,
    estimatedInputTokens: row.estimated_input_tokens,
    bargeInCount: row.barge_in_count,
    userSpeechEvents: row.user_speech_events,
  };
}

export async function startVoiceUsage(input: {
  userId: string;
  practiceSessionId?: string | null;
  realtimeSessionId?: string | null;
  plan: "free" | "pro";
  voiceMode: "hold" | "handsfree";
  model?: string;
}): Promise<{ id: string } | null> {
  try {
    if (!adminConfigured()) return null;
    const admin = createAdminSupabaseClient();
    const { data, error } = await admin
      .from("voice_session_usage")
      .insert({
        user_id: input.userId,
        practice_session_id: input.practiceSessionId ?? null,
        realtime_session_id: input.realtimeSessionId ?? null,
        plan: input.plan,
        voice_mode: input.voiceMode,
        model: input.model ?? CE_REALTIME_MODEL,
      })
      .select("id")
      .single();
    if (error || !data?.id) {
      console.warn("[voice-usage] start failed", error?.message);
      return null;
    }
    return { id: data.id as string };
  } catch (err) {
    console.warn("[voice-usage] start exception", err);
    return null;
  }
}

export async function recordVoiceUsageEvent(input: {
  usageId: string;
  userId: string;
  event:
    | "assistant_turn"
    | "user_speech"
    | "barge_in"
    | "assistant_text";
  text?: string;
  estimatedInputTokens?: number;
}): Promise<{ advice: EconomicsAdvice; usage: SessionUsageSnapshot } | null> {
  try {
    if (!adminConfigured()) return null;
    const admin = createAdminSupabaseClient();
    const { data: existing, error: readError } = await admin
      .from("voice_session_usage")
      .select("*")
      .eq("id", input.usageId)
      .eq("user_id", input.userId)
      .maybeSingle();

    if (readError || !existing) {
      console.warn("[voice-usage] read failed", readError?.message);
      return null;
    }

    const row = existing as VoiceUsageRow;
    const patch: Record<string, unknown> = {};

    if (input.event === "assistant_turn") {
      patch.assistant_turns = row.assistant_turns + 1;
    }
    if (input.event === "user_speech") {
      patch.user_speech_events = row.user_speech_events + 1;
    }
    if (input.event === "barge_in") {
      patch.barge_in_count = row.barge_in_count + 1;
    }
    if (input.event === "assistant_text" && input.text) {
      patch.estimated_output_tokens =
        row.estimated_output_tokens + estimateTokensFromText(input.text);
    }
    if (typeof input.estimatedInputTokens === "number") {
      patch.estimated_input_tokens =
        row.estimated_input_tokens + Math.max(0, input.estimatedInputTokens);
    }

    const nextSnapshot: SessionUsageSnapshot = {
      assistantTurns:
        (patch.assistant_turns as number | undefined) ?? row.assistant_turns,
      estimatedOutputTokens:
        (patch.estimated_output_tokens as number | undefined) ??
        row.estimated_output_tokens,
      estimatedInputTokens:
        (patch.estimated_input_tokens as number | undefined) ??
        row.estimated_input_tokens,
      bargeInCount:
        (patch.barge_in_count as number | undefined) ?? row.barge_in_count,
      userSpeechEvents:
        (patch.user_speech_events as number | undefined) ??
        row.user_speech_events,
    };

    const advice = adviseVoiceEconomics(nextSnapshot, "normal");
    if (advice.conciseMode) {
      patch.concise_mode_engaged = true;
    }

    const { error: writeError } = await admin
      .from("voice_session_usage")
      .update(patch)
      .eq("id", input.usageId)
      .eq("user_id", input.userId);

    if (writeError) {
      console.warn("[voice-usage] update failed", writeError.message);
    }

    return { advice, usage: nextSnapshot };
  } catch (err) {
    console.warn("[voice-usage] event exception", err);
    return null;
  }
}

export async function completeVoiceUsage(input: {
  usageId: string;
  userId: string;
  practiceSessionId?: string | null;
}): Promise<void> {
  try {
    if (!adminConfigured()) return;
    const admin = createAdminSupabaseClient();
    const { data: existing } = await admin
      .from("voice_session_usage")
      .select("*")
      .eq("id", input.usageId)
      .eq("user_id", input.userId)
      .maybeSingle();

    if (!existing) return;
    const row = existing as VoiceUsageRow;
    const endedAt = new Date();
    const startedAt = new Date(row.started_at);
    const durationSeconds = Math.max(
      0,
      Math.round((endedAt.getTime() - startedAt.getTime()) / 1000)
    );
    const cost = estimateSessionCostUsd({
      estimatedInputTokens: row.estimated_input_tokens,
      estimatedOutputTokens: row.estimated_output_tokens,
      durationSeconds,
    });

    await admin
      .from("voice_session_usage")
      .update({
        ended_at: endedAt.toISOString(),
        duration_seconds: durationSeconds,
        estimated_cost_usd: cost,
        practice_session_id:
          input.practiceSessionId ?? row.practice_session_id,
      })
      .eq("id", input.usageId)
      .eq("user_id", input.userId);
  } catch (err) {
    console.warn("[voice-usage] complete exception", err);
  }
}

export function adviceFromRow(row: VoiceUsageRow): EconomicsAdvice {
  return adviseVoiceEconomics(snapshotFromRow(row), "normal");
}
