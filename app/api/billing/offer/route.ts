import { NextResponse } from "next/server";
import { resolveMembershipOffer } from "@/lib/billing/offer";

export const runtime = "nodejs";

/**
 * Public membership offer status (no secrets).
 * Used by Pricing to verify Vercel Stripe env is actually resolving.
 */
export async function GET() {
  try {
    const offer = await resolveMembershipOffer();
    return NextResponse.json({
      configured: offer.configured,
      priceLabel: offer.priceLabel,
      productName: offer.productName,
      source: offer.source,
      interval: offer.interval,
      diagnostics: {
        hasSecretKey: offer.diagnostics.hasSecretKey,
        hasPriceOrProductId: offer.diagnostics.hasPriceOrProductId,
        idKind: offer.diagnostics.idKind,
        // Safe, non-secret resolve hint for Founder debugging in Network tab.
        resolveError: offer.diagnostics.resolveError,
      },
    });
  } catch (err) {
    console.error("[billing] offer GET", err);
    return NextResponse.json(
      { error: "Could not resolve membership offer." },
      { status: 500 }
    );
  }
}
