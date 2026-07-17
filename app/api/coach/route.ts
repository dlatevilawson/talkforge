import OpenAI from "openai";
import { NextResponse } from "next/server";
import { buildMockCoachResponse } from "@/lib/coach/mock";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

type HistoryItem = {
  role: "user" | "npc";
  text: string;
};

type Scenario = {
  id?: string;
  title?: string;
  mission?: string;
  missionPrompt?: string;
};

function parseCoachOutput(raw: string): { npc: string; forge: unknown } {
  const cleaned = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const data = JSON.parse(cleaned) as {
    npc?: unknown;
    forge?: unknown;
  };

  if (typeof data.npc !== "string" || !data.npc.trim()) {
    throw new Error("Invalid coach response: missing npc.");
  }

  if (data.forge === undefined || data.forge === null) {
    throw new Error("Invalid coach response: missing forge.");
  }

  return {
    npc: data.npc.trim(),
    forge: data.forge,
  };
}

function formatHistory(history: HistoryItem[]): string {
  if (history.length === 0) {
    return "(No prior turns.)";
  }

  return history
    .map((item) => {
      const speaker = item.role === "user" ? "User" : "Other Person";
      return `${speaker}: ${item.text}`;
    })
    .join("\n");
}

function errorDetails(error: unknown) {
  if (!(error instanceof Error)) {
    return {
      name: typeof error,
      message: String(error),
      stack: null as string | null,
      status: null as number | null,
      code: null as string | null,
    };
  }

  const withExtras = error as Error & {
    status?: number;
    code?: string;
    type?: string;
    error?: unknown;
  };

  return {
    name: withExtras.name,
    message: withExtras.message,
    stack: withExtras.stack ?? null,
    status: typeof withExtras.status === "number" ? withExtras.status : null,
    code: typeof withExtras.code === "string" ? withExtras.code : null,
    type: typeof withExtras.type === "string" ? withExtras.type : null,
    openaiError: withExtras.error ?? null,
  };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history: HistoryItem[] = Array.isArray(body.history)
      ? body.history.filter(
          (item: HistoryItem) =>
            item &&
            (item.role === "user" || item.role === "npc") &&
            typeof item.text === "string" &&
            item.text.trim()
        )
      : [];
    const scenario: Scenario =
      body.scenario && typeof body.scenario === "object" ? body.scenario : {};

    if (!message) {
      return NextResponse.json(
        { error: "A message is required." },
        { status: 400 }
      );
    }

    const client = getClient();
    if (!client) {
      console.warn(
        "[Forge/coach] OPENAI_API_KEY missing — returning mock coach response."
      );
      return NextResponse.json(
        buildMockCoachResponse(message, history, scenario)
      );
    }

    const scenarioBlock = `
Scenario title: ${scenario.title ?? "Communication practice"}
Mission: ${scenario.mission ?? "Practice deliberate communication."}
Mission prompt: ${scenario.missionPrompt ?? "Continue the conversation."}
`;

    console.log("[Forge/coach] Calling OpenAI responses.create", {
      model: "gpt-5",
      messageLength: message.length,
      historyLength: history.length,
      scenarioId: scenario.id ?? null,
    });

    const completion = await client.responses.create({
      model: "gpt-5",
      input: `
You are Forge, the AI coach inside TalkForge.

The user is practicing this communication scenario:
${scenarioBlock}

Your job is to return TWO things:

1. The next thing the OTHER PERSON says.
2. Forge's structured coaching on the user's latest message.

Conversation rules (do not change the flow):

- Stay inside the scenario above.
- Continue the conversation naturally from the prior turns.
- The other person should sound realistic.
- Never restart the scenario.
- Never repeat the mission prompt.
- Never answer for the user.
- Never put coaching advice inside "npc".

Coaching rules:

- Focus on helping the user become a better communicator, not just a better conversationalist.
- Keep feedback concise, practical, and encouraging.
- Score each dimension from 1–100 based on the user's latest message.
- "doneWell" = one specific strength in their message.
- "improve" = one concrete, actionable improvement.
- "rewrite" = a short rewritten version of their message that demonstrates that improvement. Keep their intent; do not invent a new conversation turn.
- Do not ask a follow-up question in the coaching. The rewrite is the demonstration.

Return ONLY valid JSON with this exact shape:

{
  "npc": "string — the other person's next realistic reply",
  "forge": {
    "score": 72,
    "clarity": 70,
    "confidence": 68,
    "warmth": 75,
    "curiosity": 80,
    "doneWell": "You opened with a genuine question instead of a generic compliment.",
    "improve": "Add one short personal detail so the exchange feels mutual, not interview-like.",
    "rewrite": "This place has such a great vibe — I come here to reset after long weeks. What usually brings you in?"
  }
}

Prior turns:

${formatHistory(history)}

User's latest message:

"${message}"
`,
    });

    const text = completion.output_text;
    console.log("[Forge/coach] OpenAI returned", {
      hasText: Boolean(text?.trim()),
      textLength: text?.length ?? 0,
      textPreview: text?.slice(0, 160) ?? null,
    });

    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Forge couldn't respond.", reason: "empty_output_text" },
        { status: 502 }
      );
    }

    try {
      const data = parseCoachOutput(text);
      return NextResponse.json(data);
    } catch (parseError) {
      const details = errorDetails(parseError);
      console.error("[Forge/coach] Failed to parse OpenAI JSON", {
        ...details,
        rawText: text.slice(0, 2000),
      });
      return NextResponse.json(
        {
          error: "Forge couldn't respond.",
          reason: "invalid_coach_json",
          details:
            process.env.NODE_ENV === "development" ? details.message : undefined,
        },
        { status: 502 }
      );
    }
  } catch (error) {
    const details = errorDetails(error);
    console.error("[Forge/coach] Unhandled exception", details);

    if (details.status === 401 || details.code === "invalid_api_key") {
      return NextResponse.json(
        {
          error: "Invalid OPENAI_API_KEY.",
          reason: "invalid_api_key",
          details:
            process.env.NODE_ENV === "development"
              ? {
                  name: details.name,
                  message: details.message,
                  status: details.status,
                  code: details.code,
                }
              : undefined,
        },
        { status: 401 }
      );
    }

    return NextResponse.json(
      {
        error: "Forge couldn't respond.",
        reason: "openai_or_server_exception",
        details:
          process.env.NODE_ENV === "development"
            ? {
                name: details.name,
                message: details.message,
                status: details.status,
                code: details.code,
              }
            : undefined,
      },
      {
        status: 500,
      }
    );
  }
}
