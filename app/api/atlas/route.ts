import { NextResponse } from "next/server";
import { loadAtlasContext } from "@/atlas/engine/loader";
import { generateAtlasResponse } from "@/atlas/engine/reasoning";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "A message is required." },
        { status: 400 }
      );
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 503 }
      );
    }

    const context = await loadAtlasContext();
    const response = await generateAtlasResponse(message, context);

    return NextResponse.json({ response });
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

    const message =
      error instanceof Error &&
      error.message === "OPENAI_API_KEY is not configured."
        ? error.message
        : "Atlas could not respond.";

    return NextResponse.json(
      { error: message },
      { status: message.includes("OPENAI_API_KEY") ? 503 : 500 }
    );
  }
}
