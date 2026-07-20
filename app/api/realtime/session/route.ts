import { NextResponse } from "next/server";
import {
  buildClientSecretRequest,
  type CeTrack,
} from "@/lib/ce/session-config";

export const runtime = "nodejs";

type SessionBody = {
  track?: CeTrack;
  eventTitle?: string;
  successCriteria?: string;
};

/**
 * CE-M1: Mint an ephemeral OpenAI Realtime client secret.
 * The browser never receives OPENAI_API_KEY — only a short-lived ek_ token.
 */
export async function POST(req: Request) {
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

  let body: SessionBody = {};
  try {
    const json = (await req.json()) as unknown;
    if (json && typeof json === "object") {
      body = json as SessionBody;
    }
  } catch {
    body = {};
  }

  const track = normalizeTrack(body.track);
  const payload = buildClientSecretRequest({
    track,
    eventTitle:
      typeof body.eventTitle === "string" ? body.eventTitle : undefined,
    successCriteria:
      typeof body.successCriteria === "string"
        ? body.successCriteria
        : undefined,
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
      milestone: "CE-M1",
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
