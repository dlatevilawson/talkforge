import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth/api-guard";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import {
  getStripePriceProMonthly,
  stripeBillingConfigured,
} from "@/lib/billing/config";
import { billingReturnUrls, getStripe } from "@/lib/billing/stripe";
import { loadMemberSubscription } from "@/lib/billing/entitlements";
import { ensureFreeMembershipRow } from "@/lib/billing/sync";
import { createAdminSupabaseClient, adminConfigured } from "@/lib/supabase/admin";
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

  const priceId = getStripePriceProMonthly();
  const urls = billingReturnUrls();

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Sign in required." }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("email, display_name, role")
      .eq("id", gate.userId)
      .maybeSingle();

    const membership = await loadMemberSubscription(gate.userId);
    if (
      membership &&
      (membership.status === "active" || membership.status === "trialing")
    ) {
      return NextResponse.json(
        { error: "You already have TalkForge Pro." },
        { status: 409 }
      );
    }

    const stripe = getStripe();
    let customerId = membership?.stripeCustomerId ?? null;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email:
          (typeof profile?.email === "string" && profile.email) ||
          user.email ||
          undefined,
        name:
          typeof profile?.display_name === "string"
            ? profile.display_name
            : undefined,
        metadata: { talkforge_user_id: gate.userId },
      });
      customerId = customer.id;
      if (adminConfigured()) {
        await ensureFreeMembershipRow(gate.userId);
        const admin = createAdminSupabaseClient();
        await admin
          .from("member_subscriptions")
          .update({
            stripe_customer_id: customerId,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", gate.userId);
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      client_reference_id: gate.userId,
      metadata: { talkforge_user_id: gate.userId },
      subscription_data: {
        metadata: { talkforge_user_id: gate.userId },
      },
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: urls.successUrl,
      cancel_url: urls.cancelUrl,
      allow_promotion_codes: true,
      billing_address_collection: "auto",
      // Omit payment_method_types so Checkout can offer card + Apple Pay / Google Pay
      // where Stripe supports wallets for the customer locale.
    });

    logBillingEvent("billing_upgrade_started", {
      userId: gate.userId,
      sessionId: session.id,
    });

    return NextResponse.json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error("[billing] checkout", err);
    const message =
      err instanceof Error && /No such price|Invalid API Key|price/i.test(err.message)
        ? "Stripe price or key looks misconfigured. Check STRIPE_SECRET_KEY and STRIPE_PRICE_PRO_MONTHLY in Vercel."
        : "Could not start checkout.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
