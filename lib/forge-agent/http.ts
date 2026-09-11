import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";
import { isGuestUserId } from "@/lib/identity";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { ForgeAgentError } from "./policy";
import {
  createSupabaseForgeAgentRepository,
  type ForgeAgentRepository,
} from "./repository";

export async function requireForgeAgentRepo(): Promise<
  | { ok: true; userId: string; repo: ForgeAgentRepository }
  | { ok: false; response: NextResponse }
> {
  const gate = await requireApiUser();
  if (!gate.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: gate.error }, { status: gate.status }),
    };
  }
  if (isGuestUserId(gate.userId)) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Sign in with a member account to use check-ins." },
        { status: 403 }
      ),
    };
  }
  const supabase = await createServerSupabaseClient();
  return {
    ok: true,
    userId: gate.userId,
    repo: createSupabaseForgeAgentRepository(supabase),
  };
}

export function forgeAgentErrorResponse(err: unknown): NextResponse {
  if (err instanceof ForgeAgentError) {
    return NextResponse.json({ error: err.message }, { status: err.status });
  }
  console.error("[forge-agent]", err);
  return NextResponse.json(
    { error: "Could not complete that check-in request." },
    { status: 500 }
  );
}
