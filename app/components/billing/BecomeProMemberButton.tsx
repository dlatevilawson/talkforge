"use client";

import MembershipCheckoutButton from "@/app/components/billing/MembershipCheckoutButton";
import {
  BILLING_PAGE_COPY,
  CLAIM_FOUNDING_PASS_CTA,
} from "@/lib/billing/member-copy";

type Props = {
  source: string;
  className?: string;
};

/** In-app Founding Pass CTA — starts Stripe Checkout (sign-in redirect if needed). */
export default function BecomeProMemberButton({ source, className }: Props) {
  return (
    <MembershipCheckoutButton
      source={source}
      label={CLAIM_FOUNDING_PASS_CTA}
      loginNext="/app/billing?checkout=1"
      helperText={BILLING_PAGE_COPY.proPlan.footerSubtext}
      className={
        className ??
        "w-full rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
      }
    />
  );
}
