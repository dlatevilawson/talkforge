import { NextResponse } from "next/server";
import { loadAtlasContext } from "@/atlas/engine/loader";
import { generateAtlasResponse } from "@/atlas/engine/reasoning";
import {
  getRuntimeFlagSnapshot,
  isTargetFounderVisibleEnabled,
  isTargetPlaneEnabled,
  runTargetPipeline,
} from "@/atlas/runtime";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "A message is required." },
        { status: 400 }
      );
    }

    // Founder-visible target delivery — ATLAS-D-FLAGS: remains OFF (observation window).
    if (isTargetFounderVisibleEnabled()) {
      const result = await runTargetPipeline({ message, source: "founder" });
      if (!result.ok || !result.delivery || result.delivery.channel !== "founder") {
        return NextResponse.json(
          {
            error: result.state.error ?? "Target plane did not PASS Integrity.",
            plane: "target",
            validation: result.state.validation?.result ?? null,
            request_id: result.state.request_id,
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        response: result.delivery.deliverable,
        plane: "target",
        binding: false,
        validation: result.state.validation?.result,
        request_id: result.state.request_id,
        recommendation_id: result.state.recommendation?.recommendation_id,
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OPENAI_API_KEY is not configured." },
        { status: 503 }
      );
    }

    // ATLAS-D-FLAGS: TARGET is active internal implementation (observation window).
    // Legacy continues to serve Founder-visible response.
    let observation:
      | {
          request_id: string;
          validation: string | null;
          authority: string | null;
          disposition: string | null;
          ok: boolean;
          audit_events: number;
          delivery_suppressed: true;
        }
      | undefined;

    if (isTargetPlaneEnabled()) {
      try {
        const target = await runTargetPipeline({ message, source: "founder" });
        observation = {
          request_id: target.state.request_id,
          validation: target.state.validation?.result ?? null,
          authority: target.state.authority?.result ?? null,
          disposition: target.state.disposition?.class ?? null,
          ok: target.ok,
          audit_events: target.state.audit.length,
          delivery_suppressed: true,
        };
      } catch (observationError) {
        console.error("Target plane observation run failed:", observationError);
      }
    }

    const context = await loadAtlasContext();
    const response = await generateAtlasResponse(message, context);
    const flags = getRuntimeFlagSnapshot();

    return NextResponse.json({
      response,
      plane: "legacy",
      binding_surface: "legacy",
      runtime: {
        target_active: flags.target,
        founder_visible: flags.founderVisible,
        observation_window: flags.observationWindow,
      },
      ...(observation ? { observation } : {}),
      // Backward-compatible alias for earlier shadow metadata consumers
      ...(observation
        ? {
            shadow: {
              request_id: observation.request_id,
              validation: observation.validation,
              ok: observation.ok,
            },
          }
        : {}),
    });
  } catch (error) {
    console.error(error);

    const status =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status: unknown }).status === "number"
        ? (error as { status: number }).status
        : 500;

    if (status === 401) {
      return NextResponse.json(
        { error: "Invalid OPENAI_API_KEY." },
        { status: 401 }
      );
    }

    const message =
      error instanceof Error &&
      error.message === "OPENAI_API_KEY is not configured."
        ? error.message
        : "Atlas could not respond.";

    return NextResponse.json(
      { error: message },
      { status: message.includes("OPENAI_API_KEY") ? 503 : 500 }
    );
  }
}
