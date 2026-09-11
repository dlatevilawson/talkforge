import { NextResponse } from "next/server";
import {
  forgeAgentErrorResponse,
  requireForgeAgentRepo,
} from "@/lib/forge-agent/http";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const gate = await requireForgeAgentRepo();
  if (!gate.ok) return gate.response;
  try {
    const { id } = await context.params;
    const action = await gate.repo.denyAction(gate.userId, id);
    return NextResponse.json({ action });
  } catch (err) {
    return forgeAgentErrorResponse(err);
  }
}
