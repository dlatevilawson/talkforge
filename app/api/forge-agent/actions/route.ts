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
    const actions = await gate.repo.materializeDueActions(gate.userId);
    return NextResponse.json({ actions });
  } catch (err) {
    return forgeAgentErrorResponse(err);
  }
}
