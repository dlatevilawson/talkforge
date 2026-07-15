import OpenAI from "openai";
import { NextResponse } from "next/server";
import { ATLAS_FOUNDING_CHARTER } from "@/app/atlas/charter";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";
    const history: ChatMessage[] = Array.isArray(body.history)
      ? body.history.filter(
          (item: ChatMessage) =>
            item &&
            (item.role === "user" || item.role === "assistant") &&
            typeof item.content === "string"
        )
      : [];

    if (!message) {
      return NextResponse.json(
        { error: "A question is required." },
        { status: 400 }
      );
    }

    const client = getClient();
    if (!client) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 503 }
      );
    }

    const completion = await client.responses.create({
      model: "gpt-5",
      instructions: `${ATLAS_FOUNDING_CHARTER}

⸻

Operational reminder for this interface:

You are responding inside the Atlas dashboard (Ask Atlas).
Apply the Founding Charter above as your identity without rewriting it.
Use the Decision Standard for significant recommendations.
State confidence when recommending.
Do not present recommendations as final decisions.
Keep responses calm, concise, and analytically useful.`,
      input: [
        ...history.map((item) => ({
          role: item.role,
          content: item.content,
        })),
        {
          role: "user" as const,
          content: message,
        },
      ],
    });

    const reply = completion.output_text?.trim();

    if (!reply) {
      return NextResponse.json(
        { error: "Atlas returned an empty response." },
        { status: 502 }
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Atlas could not respond." },
      { status: 500 }
    );
  }
}
