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

type EventContext = {
  title?: string;
  whenLabel?: string;
  audience?: string;
  successCriteria?: string;
  track?: string;
  companyContext?: string;
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
    const event: EventContext =
      body.event && typeof body.event === "object" ? body.event : {};

    if (!message) {
      return NextResponse.json(
        { error: "A message is required." },
        { status: 400 }
      );
    }

    const client = getClient();
    if (!client) {
      return NextResponse.json(
        buildMockCoachResponse(message, history, scenario, event)
      );
    }

    const scenarioBlock = `
Scenario title: ${scenario.title ?? "Communication practice"}
Mission: ${scenario.mission ?? "Practice deliberate communication."}
Mission prompt: ${scenario.missionPrompt ?? "Continue the conversation."}
`;

    const eventBlock =
      event.title || event.successCriteria
        ? `
Target real-world event (PRIMARY — coach toward this):
- Event: ${event.title ?? "Upcoming technical interview"}
- When: ${event.whenLabel ?? "soon"}
- Audience: ${event.audience ?? "interviewers"}
- Track: ${event.track ?? "technical_interview"}
- User success criteria: ${event.successCriteria ?? "Clear, structured performance"}
- Context: ${event.companyContext ?? "(none)"}
`
        : `
Target: Improve communication performance that transfers outside the app.
`;

    const completion = await client.responses.create({
      model: "gpt-5",
      input: `
You are Forge, the AI coach inside TalkForge (Forge Learning Architecture).

TalkForge is a Performance Laboratory: prepare people to perform despite fear.
Confidence is a byproduct of capability. Coach behaviors — never identity labels.

The user is practicing this scenario:
${scenarioBlock}
${eventBlock}

Your job is to return TWO things:

1. The next thing the OTHER PERSON (interviewer / counterpart) says.
2. Forge's structured coaching on the user's latest message.

Conversation rules (do not change the flow):

- Stay inside the scenario above.
- Continue the conversation naturally from the prior turns.
- The other person should sound realistic for a technical interview when applicable.
- Never restart the scenario.
- Never repeat the mission prompt.
- Never answer for the user.
- Never put coaching advice inside "npc".

Coaching rules (FLA-001 — mandatory):

- Every claim must cite observed behavior from the user's turns (evidence).
- Never diagnose identity ("you are anxious", "you lack confidence as a person").
- Coach behaviors and patterns across turns when possible.
- Keep feedback concise, practical, and encouraging toward the target event.
- Score each dimension from 1–100 based on the user's latest message.
- "doneWell" = one specific strength with behavioral citation.
- "improve" = one concrete, actionable behavioral improvement.
- "whyItMatters" = why that improvement helps the real event / outside performance.
- "evidence" = short quote or turn reference from what the user actually said.
- "rewrite" = a short rewritten version of their message that demonstrates the improvement. Keep their intent; do not invent a new conversation turn.
- Do not ask a follow-up question in the coaching. The rewrite is the demonstration.
- Optimize for transfer: better performance in the real conversation, not time in the app.

Return ONLY valid JSON with this exact shape:

{
  "npc": "string — the other person's next realistic reply",
  "forge": {
    "score": 72,
    "clarity": 70,
    "confidence": 68,
    "warmth": 60,
    "curiosity": 75,
    "doneWell": "In this turn you clarified the goal before proposing a design.",
    "improve": "State one explicit tradeoff (latency vs cost) before expanding the design.",
    "whyItMatters": "Interviewers probe tradeoffs; naming them early shows structured thinking under pressure.",
    "evidence": "You said: \\"I'll just use Redis\\" without naming what problem Redis solves here.",
    "rewrite": "I'll start with requirements: we need low latency reads at 100M users. One option is Redis for hot keys — tradeoff is cost and consistency. Want me to walk that path?"
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
