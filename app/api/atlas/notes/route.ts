import { NextResponse } from "next/server";
import { createFounderNote, listFounderNotes } from "@/atlas/engine/notes";

export async function GET() {
  try {
    const notes = await listFounderNotes(30);
    return NextResponse.json({ notes });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load founder notes.",
      },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const text = typeof body.body === "string" ? body.body : "";
    const note = await createFounderNote(text);
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error ? error.message : "Failed to save founder note.";
    const status =
      message.includes("required") || message.includes("missing")
        ? 400
        : message.includes("not configured")
          ? 503
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
