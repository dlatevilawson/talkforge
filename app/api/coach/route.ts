import OpenAI from "openai";
import { NextResponse } from "next/server";
import { buildMockCoachResponse } from "@/lib/coach/mock";

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
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
      return NextResponse.json(
        buildMockCoachResponse(message, history, scenario)
      );
    }

    const scenarioBlock = `
Scenario title: ${scenario.title ?? "Communication practice"}
Mission: ${scenario.mission ?? "Practice deliberate communication."}
Mission prompt: ${scenario.missionPrompt ?? "Continue the conversation."}
`;

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
    if (!text?.trim()) {
      return NextResponse.json(
        { error: "Forge couldn't respond." },
        { status: 502 }
      );
    }

    const data = parseCoachOutput(text);

    return NextResponse.json(data);
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      {
        error: "Forge couldn't respond.",
      },
      {
        status: 500,
      }
    );
  }
}
