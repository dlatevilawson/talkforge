import { NextResponse } from "next/server";
import {
  forgeAgentErrorResponse,
  requireForgeAgentRepo,
} from "@/lib/forge-agent/http";
import { isForgeCueKind } from "@/lib/forge-agent/policy";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireForgeAgentRepo();
  if (!gate.ok) return gate.response;
  try {
    const cues = await gate.repo.listCues(gate.userId);
    return NextResponse.json({ cues });
  } catch (err) {
    return forgeAgentErrorResponse(err);
  }
}

export async function POST(request: Request) {
  const gate = await requireForgeAgentRepo();
  if (!gate.ok) return gate.response;
  try {
    const body = (await request.json()) as {
      kind?: unknown;
      title?: unknown;
      successCriteria?: unknown;
      dueAt?: unknown;
    };
    if (!isForgeCueKind(body.kind)) {
      return NextResponse.json(
        {
          error:
            "Kind must be upcoming conversation, practice follow-up, or homework.",
        },
        { status: 400 }
      );
    }
    const cue = await gate.repo.createCue(gate.userId, {
      kind: body.kind,
      title: typeof body.title === "string" ? body.title : "",
      successCriteria:
        typeof body.successCriteria === "string" ? body.successCriteria : null,
      dueAt: typeof body.dueAt === "string" ? body.dueAt : "",
    });
    return NextResponse.json({ cue }, { status: 201 });
  } catch (err) {
    return forgeAgentErrorResponse(err);
  }
}
