import { NextResponse } from "next/server";
import { getTodayJourney } from "@/lib/journey/server";

export async function GET() {
  try {
    return NextResponse.json({ journey: await getTodayJourney() });
  } catch (error) {
    return NextResponse.json({ journey: null, error: error instanceof Error ? error.message : "Journey unavailable" }, { status: 200 });
  }
}
