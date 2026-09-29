import { NextResponse } from "next/server";
import { authorizeForgeAgentCron } from "@/lib/forge-agent/cron-auth";
import { runReadinessBoundaryFixturePass } from "@/lib/readiness/shadow-fixture-runner";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MODEL = "gpt-5";

export async function GET(request: Request) {
  if (!authorizeForgeAgentCron(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    return NextResponse.json(
      { error: "OpenAI is not configured." },
      { status: 503 }
    );
  }

  const summary = await runReadinessBoundaryFixturePass({
    apiKey,
    model: MODEL,
    concurrency: 2,
  });

  console.log("READINESS_FIXTURE_VALIDATION", JSON.stringify(summary));
  return NextResponse.json(summary, { status: summary.failed === 0 ? 200 : 422 });
}
