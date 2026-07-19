import { NextResponse } from "next/server";
import { loadAtlasContext } from "@/atlas/engine/loader";
import { generateAtlasResponse } from "@/atlas/engine/reasoning";
import {
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

    // Target plane Founder-visible delivery: both flags required.
    // ATLAS-D-W4: do not enable for Founder exposure until separate Founder decision.
    // Default remains Legacy Ask Atlas. Loader freeze preserved.
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

    // Shadow: run target pipeline for Trace/validation practice without serving it.
    let shadow:
      | {
          request_id: string;
          validation: string | null;
          ok: boolean;
        }
      | undefined;
    if (isTargetPlaneEnabled()) {
      try {
        const target = await runTargetPipeline({ message, source: "founder" });
        shadow = {
          request_id: target.state.request_id,
          validation: target.state.validation?.result ?? null,
          ok: target.ok,
        };
      } catch (shadowError) {
        console.error("Target plane shadow run failed:", shadowError);
      }
    }

    const context = await loadAtlasContext();
    const response = await generateAtlasResponse(message, context);

    return NextResponse.json({
      response,
      plane: "legacy",
      ...(shadow ? { shadow } : {}),
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
