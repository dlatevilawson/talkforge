import { NextResponse } from "next/server";
import type Stripe from "stripe";
import { getStripe } from "@/lib/billing/stripe";
import { stripeWebhookConfigured } from "@/lib/billing/config";
import {
  markSubscriptionExpired,
  upsertSubscriptionFromStripe,
} from "@/lib/billing/sync";
import { createAdminSupabaseClient, adminConfigured } from "@/lib/supabase/admin";
import { logBillingEvent } from "@/lib/billing/analytics";

export const runtime = "nodejs";

async function resolveUserId(
  subscription: Stripe.Subscription,
  customerId: string
): Promise<string | null> {
  const meta = subscription.metadata?.talkforge_user_id;
  if (meta && typeof meta === "string" && meta.trim()) {
    return meta.trim();
  }

  if (!adminConfigured()) return null;
  const admin = createAdminSupabaseClient();
  const { data } = await admin
    .from("member_subscriptions")
    .select("user_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  return typeof data?.user_id === "string" ? data.user_id : null;
}

export async function POST(req: Request) {
  if (!stripeWebhookConfigured()) {
    return NextResponse.json(
      { error: "Webhook secret not configured." },
      { status: 503 }
    );
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await req.text();
  const secret = process.env.STRIPE_WEBHOOK_SECRET!.trim();
  const stripe = getStripe();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.warn(
      "[billing] webhook signature failed",
      err instanceof Error ? err.message : err
    );
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        logBillingEvent("billing_checkout_completed", {
          sessionId: session.id,
          userId: session.client_reference_id ?? session.metadata?.talkforge_user_id,
        });
        if (session.mode === "subscription" && session.subscription) {
          const subId =
            typeof session.subscription === "string"
              ? session.subscription
              : session.subscription.id;
          const subscription = await stripe.subscriptions.retrieve(subId);
          const customerId =
            typeof session.customer === "string"
              ? session.customer
              : session.customer?.id;
          const userId =
            session.client_reference_id ||
            session.metadata?.talkforge_user_id ||
            subscription.metadata?.talkforge_user_id;
          if (userId && customerId) {
            await upsertSubscriptionFromStripe(userId, subscription, customerId);
          }
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const userId = await resolveUserId(subscription, customerId);
        if (userId) {
          await upsertSubscriptionFromStripe(userId, subscription, customerId);
          if (event.type === "customer.subscription.updated") {
            logBillingEvent("billing_subscription_renewed", {
              userId,
              status: subscription.status,
            });
          }
        }
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer.id;
        const userId = await resolveUserId(subscription, customerId);
        if (userId) {
          await markSubscriptionExpired(userId);
          logBillingEvent("billing_subscription_canceled", { userId });
        }
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        logBillingEvent("billing_payment_failed", {
          customerId:
            typeof invoice.customer === "string"
              ? invoice.customer
              : invoice.customer?.id,
          invoiceId: invoice.id,
        });
        break;
      }
      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[billing] webhook handler", err);
    return NextResponse.json({ error: "Webhook handler failed." }, { status: 500 });
  }
}
