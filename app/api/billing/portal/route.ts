import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";
import { stripeBillingConfigured } from "@/lib/billing/config";
import { billingReturnUrls, getStripe } from "@/lib/billing/stripe";
import { loadMemberSubscription } from "@/lib/billing/entitlements";
import { logBillingEvent } from "@/lib/billing/analytics";

export const runtime = "nodejs";

export async function POST() {
  const gate = await requireApiUser();
  if (!gate.ok) {
    return NextResponse.json({ error: gate.error }, { status: gate.status });
  }

  if (!stripeBillingConfigured()) {
    return NextResponse.json(
      { error: "Billing is not configured yet." },
      { status: 503 }
    );
  }

  try {
    const membership = await loadMemberSubscription(gate.userId);
    if (!membership?.stripeCustomerId) {
      return NextResponse.json(
        { error: "No billing customer yet. Upgrade to Pro first." },
        { status: 404 }
      );
    }

    const stripe = getStripe();
    const urls = billingReturnUrls();
    const portal = await stripe.billingPortal.sessions.create({
      customer: membership.stripeCustomerId,
      return_url: urls.portalReturnUrl,
    });

    logBillingEvent("billing_portal_opened", { userId: gate.userId });

    return NextResponse.json({ url: portal.url });
  } catch (err) {
    console.error("[billing] portal", err);
    return NextResponse.json(
      { error: "Could not open billing portal." },
      { status: 500 }
    );
  }
}
