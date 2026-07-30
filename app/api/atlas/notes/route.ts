import { NextResponse } from "next/server";
import { createFounderNote, listFounderNotes } from "@/atlas/engine/notes";
import { requireApiUser } from "@/lib/auth/api-guard";
import { canAccessFounderPortal } from "@/lib/auth/roles";
import { readSession } from "@/lib/auth/session";

async function requireFounderApi(): Promise<
  { ok: true } | { ok: false; response: NextResponse }
> {
  const auth = await requireApiUser();
  if (!auth.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: auth.error },
        { status: auth.status }
      ),
    };
  }

  const session = await readSession();
  if (!session.role || !canAccessFounderPortal(session.role)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Founder access required." },
        { status: 403 }
      ),
    };
  }

  return { ok: true };
}

export async function GET() {
  const gate = await requireFounderApi();
  if (!gate.ok) return gate.response;

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
  const gate = await requireFounderApi();
  if (!gate.ok) return gate.response;

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
