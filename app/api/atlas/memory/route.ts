import { NextResponse } from "next/server";
import { listExecutiveMemory } from "@/atlas/engine/executive-memory-store";
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
    const records = await listExecutiveMemory(40);
    return NextResponse.json({ records, canonical: false });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load Executive Memory.",
      },
      { status: 500 }
    );
  }
}
