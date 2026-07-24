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
      strength:
        "You chose to show up and begin — that courage already sets you apart from waiting forever.",
      improve:
        "Next time, say one full thought out loud so we can reveal what you’re already capable of.",
      nextAction:
        "Before your next real conversation, name one thing you want to sound clear about — then practice it once with Forge.",
    };
  }

  return {
    strength:
      "You practiced out loud instead of only thinking it through — that is real preparation, and it shows capability.",
    improve:
      "Slow down at the start of your next answer and state your main point in one sentence first.",
    nextAction:
      "In your next real conversation, lead with that one-sentence point — you’re becoming someone who prepares.",
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

Rules (FLA-001 + AMD-001 Human Dignity Standard):
- Honor courage first: acknowledge that showing up to practice matters.
- Reflect genuine capability with evidence — do not invent empty praise.
- Guide ONE clear, achievable behavioral improvement.
- Reinforce identity: they are becoming someone who prepares before conversations that matter.
- Invite forward: leave them wanting another rep, not fearing evaluation.
- Coach behaviors only. Never diagnose identity. Never shame.
- Practice is preparation — never remediation.
- Optimize for transfer outside the app.

Target event context: ${eventTitle}

Transcript:
${lines.join("\n")}

Return ONLY valid JSON:
{
  "strength": "Honor courage + one evidenced capability (1–2 sentences)",
  "improve": "one concrete behavioral improvement that feels achievable (1 sentence)",
  "nextAction": "one clear real-world action + brief identity reinforcement that they are becoming someone who prepares (1–2 sentences)"
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
