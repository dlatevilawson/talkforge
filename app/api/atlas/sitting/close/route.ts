import { NextResponse } from "next/server";
import { closeAskAtlasSitting } from "@/atlas/engine/executive-memory-store";
import { normalizeAtlasThread } from "@/atlas/engine/thread";
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

export async function POST(req: Request) {
  const gate = await requireFounderApi();
  if (!gate.ok) return gate.response;

  try {
    const body = (await req.json()) as { thread?: unknown };
    const thread = normalizeAtlasThread(body.thread);
    const result = await closeAskAtlasSitting(thread);
    return NextResponse.json({
      sitting_id: result.sitting_id,
      records: result.records,
      extracted: result.records.length,
      canonical: false,
    });
  } catch (error) {
    console.error(error);
    const message =
      error instanceof Error
        ? error.message
        : "Failed to close Ask Atlas sitting.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
