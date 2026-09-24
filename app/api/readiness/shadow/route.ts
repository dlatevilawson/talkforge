import { after, NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";
import { evaluateCompletedSessionInShadow } from "@/lib/readiness/shadow-server";
import { shadowEvaluationAllowed } from "@/lib/readiness/shadow-runner";

export const runtime = "nodejs";
export const maxDuration = 30;

function validSessionId(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length > 0 &&
    value.length <= 128 &&
    /^[a-zA-Z0-9_-]+$/.test(value)
  );
}

export async function POST(request: Request) {
  const gate = await requireApiUser();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  let sessionId: unknown;
  try {
    sessionId = ((await request.json()) as { sessionId?: unknown }).sessionId;
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!validSessionId(sessionId)) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  // A generic response prevents the hidden assessment state, eligibility, and
  // evaluation result from becoming a member-visible API surface.
  if (shadowEvaluationAllowed(gate.userId)) {
    after(async () => {
      try {
        const result = await evaluateCompletedSessionInShadow({
          sessionId,
          userId: gate.userId,
        });
        console.info(`[readiness-shadow] ${result.status}`);
      } catch {
        console.info("[readiness-shadow] failed");
      }
    });
  }

  return NextResponse.json({ accepted: true }, { status: 202 });
}
