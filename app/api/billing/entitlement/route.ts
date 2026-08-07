import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { evaluatePracticeEntitlement } from "@/lib/billing/entitlements";

export const runtime = "nodejs";

export async function GET() {
  const gate = await requireApiUser();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  try {
    const supabase = await createServerSupabaseClient();
    const { data } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", gate.userId)
      .maybeSingle();
    const role = typeof data?.role === "string" ? data.role : null;
    const entitlement = await evaluatePracticeEntitlement(gate.userId, role);
    return NextResponse.json({ entitlement });
  } catch (err) {
    console.error("[billing] entitlement GET", err);
    return NextResponse.json(
      { error: "Could not evaluate practice access." },
      { status: 500 }
    );
  }
}
