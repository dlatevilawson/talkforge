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
2. Forge's coaching.

Rules:

- Stay inside the scenario.
- Continue the conversation naturally.
- The other person should sound realistic.
- Forge should coach in 2-4 sentences.
- Forge explains WHY something worked or didn't.
- Forge ends with ONE follow-up question that moves the conversation forward.
- Never restart the scenario.
- Never repeat the mission prompt.
- Never answer for the user.

Return ONLY valid JSON.

Example:

{
  "npc": "That's interesting. I actually come here every Tuesday after work.",
  "forge": "Nice opening. You began with curiosity instead of making assumptions. Now try sharing something about yourself so the conversation feels balanced. What would you say next?"
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