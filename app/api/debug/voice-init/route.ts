import { appendFile } from "node:fs/promises";
import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";

export const runtime = "nodejs";

type DebugPayload = {
  hypothesisId?: unknown;
  location?: unknown;
  message?: unknown;
  data?: unknown;
  timestamp?: unknown;
};

const LOG_PATH = "/opt/cursor/logs/debug.log";
const HYPOTHESES = new Set(["A", "B", "C", "D", "E"]);

/**
 * Temporary authenticated DEBUG MODE sink for browser-only voice diagnostics.
 * The caller intentionally omits secrets, user content, identifiers, and PII.
 */
export async function POST(req: Request) {
  const gate = await requireApiUser();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  const body = (await req.json().catch(() => null)) as DebugPayload | null;
  if (
    !body ||
    !HYPOTHESES.has(String(body.hypothesisId)) ||
    typeof body.location !== "string" ||
    typeof body.message !== "string" ||
    !body.data ||
    typeof body.data !== "object"
  ) {
    return NextResponse.json({ error: "Invalid debug payload." }, { status: 400 });
  }

  const entry = {
    hypothesisId: String(body.hypothesisId),
    location: body.location.slice(0, 160),
    message: body.message.slice(0, 160),
    data: body.data,
    timestamp:
      typeof body.timestamp === "number" ? body.timestamp : Date.now(),
  };

  await appendFile(LOG_PATH, `${JSON.stringify(entry)}\n`, "utf8");
  return NextResponse.json({ ok: true });
}
