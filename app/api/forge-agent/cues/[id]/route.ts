import { NextResponse } from "next/server";
import {
  forgeAgentErrorResponse,
  requireForgeAgentRepo,
} from "@/lib/forge-agent/http";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireForgeAgentRepo();
  if (!gate.ok) return gate.response;
  try {
    const { id } = await context.params;
    const body = (await request.json()) as { status?: unknown };
    if (
      body.status !== "active" &&
      body.status !== "paused" &&
      body.status !== "cancelled"
    ) {
      return NextResponse.json(
        { error: "Status must be pause, resume, or cancel." },
        { status: 400 }
      );
    }
    const cue = await gate.repo.patchCue(gate.userId, id, {
      status: body.status,
    });
    return NextResponse.json({ cue });
  } catch (err) {
    return forgeAgentErrorResponse(err);
  }
}
