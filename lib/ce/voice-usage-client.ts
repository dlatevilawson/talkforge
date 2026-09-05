/**
 * Client helper for invisible voice economics tracking.
 * Never render returned token advice as a meter — only apply max_output_tokens.
 */

export type VoiceUsageEvent =
  | "assistant_turn"
  | "user_speech"
  | "barge_in"
  | "assistant_text";

export type VoiceUsageAdvice = {
  maxOutputTokens: number | null;
  conciseMode: boolean;
};

export async function startVoiceUsageTracking(input: {
  practiceSessionId?: string | null;
  realtimeSessionId?: string | null;
  voiceMode: "hold" | "handsfree";
  model?: string;
}): Promise<string | null> {
  try {
    const res = await fetch("/api/voice/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "start", ...input }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { usageId?: string | null };
    return data.usageId ?? null;
  } catch {
    return null;
  }
}

export async function reportVoiceUsageEvent(input: {
  usageId: string;
  event: VoiceUsageEvent;
  text?: string;
  estimatedInputTokens?: number;
}): Promise<VoiceUsageAdvice | null> {
  try {
    const res = await fetch("/api/voice/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "event", ...input }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      maxOutputTokens?: number | null;
      conciseMode?: boolean;
    };
    return {
      maxOutputTokens:
        typeof data.maxOutputTokens === "number" ? data.maxOutputTokens : null,
      conciseMode: Boolean(data.conciseMode),
    };
  } catch {
    return null;
  }
}

export async function completeVoiceUsageTracking(input: {
  usageId: string;
  practiceSessionId?: string | null;
}): Promise<void> {
  try {
    await fetch("/api/voice/usage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "complete", ...input }),
    });
  } catch {
    /* soft-fail — never block wrap */
  }
}
