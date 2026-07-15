import OpenAI from "openai";
import { NextResponse } from "next/server";
import { ATLAS_FOUNDING_CHARTER } from "@/app/atlas/charter";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

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

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 503 }
      );
    }

    const client = new OpenAI({ apiKey });

    const response = await client.responses.create({
      model: "gpt-5",
      instructions: ATLAS_FOUNDING_CHARTER,
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

    const reply = response.output_text?.trim();

    if (!reply) {
      return NextResponse.json(
        { error: "Atlas returned an empty response." },
        { status: 502 }
      );
    }

    return NextResponse.json({ reply });
  } catch (error) {
    console.error(error);

    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status: unknown }).status === "number"
        ? (error as { status: number }).status
        : 500;

    if (status === 401) {
      return NextResponse.json(
        { error: "Invalid OPENAI_API_KEY." },
        { status: 401 }
      );
    }

    return NextResponse.json(
      { error: "Atlas could not respond." },
      { status: 500 }
    );
  }
}
