import "server-only";

import Stripe from "stripe";
import { getSiteUrl } from "@/lib/auth/constants";

let stripeSingleton: Stripe | null = null;

export function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY?.trim();
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not configured.");
  }
  if (!stripeSingleton) {
    stripeSingleton = new Stripe(key, {
      apiVersion: "2025-08-27.basil",
      typescript: true,
    });
  }
  return stripeSingleton;
}

export function billingReturnUrls() {
  const base = getSiteUrl().replace(/\/$/, "");
  return {
    successUrl: `${base}/app/billing?checkout=success`,
    cancelUrl: `${base}/app/billing?checkout=canceled`,
    portalReturnUrl: `${base}/app/billing`,
    membershipUrl: `${base}/membership`,
  };
}
