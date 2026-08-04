import { NextResponse } from "next/server";

/**
 * Privileged cloud guest migration is retired under HARDEN-005.
 * Same-device browser migration remains client-side.
 */
export async function POST() {
  return NextResponse.json(
    {
      ok: false,
      migrated: false,
      message:
        "Cloud guest migration is retired. Same-device local data migrates without this endpoint.",
    },
    {
      status: 410,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
