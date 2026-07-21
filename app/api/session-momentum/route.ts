import OpenAI from "openai";
import { NextResponse } from "next/server";

type TurnIn = {
  role?: string;
  text?: string;
};

export type SessionMomentum = {
  strength: string;
  improve: string;
  nextAction: string;
};

function fallbackMomentum(hasUserSpeech: boolean): SessionMomentum {
  if (!hasUserSpeech) {
    return {
      strength: "You showed up and started a practice session — that already takes courage.",
      improve: "Next time, say one full thought out loud so we have something concrete to coach.",
      nextAction:
        "Before your next real conversation, name one thing you want to sound clear about — then practice it once with Forge.",
    };
  }

  return {
    strength: "You practiced out loud instead of only thinking it through — that builds real readiness.",
    improve: "Slow down at the start of your next answer and state your main point in one sentence first.",
    nextAction:
      "In your next real conversation, lead with that one-sentence point before you explain details.",
  };
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      turns?: TurnIn[];
      eventTitle?: string;
    };

    const turns = Array.isArray(body.turns) ? body.turns : [];
    const lines = turns
      .filter((t) => typeof t.text === "string" && t.text.trim())
      .map((t) => {
        const role =
          t.role === "founder" || t.role === "user" ? "You" : "Forge";
        return `${role}: ${t.text!.trim()}`;
      });

    const hasUserSpeech = turns.some(
      (t) =>
        (t.role === "founder" || t.role === "user") &&
        typeof t.text === "string" &&
        t.text.trim()
    );

    const eventTitle =
      typeof body.eventTitle === "string" && body.eventTitle.trim()
        ? body.eventTitle.trim()
        : "an upcoming high-stakes conversation";

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || lines.length === 0) {
      return NextResponse.json(fallbackMomentum(hasUserSpeech));
    }

    const client = new OpenAI({ apiKey });
    const completion = await client.responses.create({
      model: "gpt-5",
      input: `
You are Forge, the warm practice coach inside TalkForge (a communication gym).

The user just finished a short voice practice. Create momentum for their REAL conversation — not app engagement.

Rules (FLA-001):
- Coach behaviors only. Never diagnose identity.
- Cite what they actually said when possible.
- Be supportive, specific, and brief.
- Optimize for transfer outside the app.

Target event context: ${eventTitle}

Transcript:
${lines.join("\n")}

Return ONLY valid JSON:
{
  "strength": "one specific thing they did well (1 sentence)",
  "improve": "one concrete behavioral improvement (1 sentence)",
  "nextAction": "one clear action to try in their next real conversation (1 sentence)"
}
`,
    });

    const raw = completion.output_text?.trim() ?? "";
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as Partial<SessionMomentum>;
    if (
      typeof parsed.strength !== "string" ||
      typeof parsed.improve !== "string" ||
      typeof parsed.nextAction !== "string"
    ) {
      return NextResponse.json(fallbackMomentum(hasUserSpeech));
    }

    return NextResponse.json({
      strength: parsed.strength.trim(),
      improve: parsed.improve.trim(),
      nextAction: parsed.nextAction.trim(),
    } satisfies SessionMomentum);
  } catch (err) {
    console.error("session-momentum", err);
    return NextResponse.json(
      fallbackMomentum(true),
      { status: 200 }
    );
  }
}
