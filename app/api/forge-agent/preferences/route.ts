import { NextResponse } from "next/server";
import {
  forgeAgentErrorResponse,
  requireForgeAgentRepo,
} from "@/lib/forge-agent/http";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireForgeAgentRepo();
  if (!gate.ok) return gate.response;
  try {
    const preferences = await gate.repo.getPreferences(gate.userId);
    return NextResponse.json({ preferences });
  } catch (err) {
    return forgeAgentErrorResponse(err);
  }
}

export async function PUT(request: Request) {
  const gate = await requireForgeAgentRepo();
  if (!gate.ok) return gate.response;
  try {
    const body = (await request.json()) as {
      outreachEnabled?: unknown;
      quietHours?: unknown;
    };
    const preferences = await gate.repo.updatePreferences(gate.userId, {
      outreachEnabled:
        typeof body.outreachEnabled === "boolean"
          ? body.outreachEnabled
          : undefined,
      quietHours:
        body.quietHours === null ||
        (body.quietHours && typeof body.quietHours === "object")
          ? (body.quietHours as { start?: string; end?: string } | null)
          : undefined,
    });
    return NextResponse.json({ preferences });
  } catch (err) {
    return forgeAgentErrorResponse(err);
  }
}
