import OpenAI from "openai";
import { NextResponse } from "next/server";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(req: Request) {
  try {
    const { message } = await req.json();

    const completion = await client.responses.create({
      model: "gpt-5",
      input: `
You are Forge, the AI coach inside TalkForge.

The user is practicing a communication scenario.

Your job is to return TWO things:

1. The next thing the OTHER PERSON says.
2. Forge's structured coaching on the user's latest message.

Conversation rules (do not change the flow):

- Stay inside the scenario.
- Continue the conversation naturally.
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

User's latest message:

"${message}"
`,
    });

    const text = completion.output_text;

    const data = JSON.parse(text);

    console.log(data);

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
