import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { buildMembershipView } from "@/lib/billing/entitlements";

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
    const membership = await buildMembershipView(gate.userId, role);
    return NextResponse.json({ membership });
  } catch (err) {
    console.error("[billing] membership GET", err);
    return NextResponse.json(
      { error: "Could not load membership." },
      { status: 500 }
    );
  }
}
