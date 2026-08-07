"use client";

import MembershipCheckoutButton from "@/app/components/billing/MembershipCheckoutButton";
import { BECOME_PRO_MEMBER_CTA } from "@/lib/billing/member-copy";

type Props = {
  source: string;
  className?: string;
};

/** In-app Pro CTA — starts Stripe Checkout (sign-in redirect if needed). */
export default function BecomeProMemberButton({ source, className }: Props) {
  return (
    <MembershipCheckoutButton
      source={source}
      label={BECOME_PRO_MEMBER_CTA}
      loginNext="/app/billing?checkout=1"
      className={
        className ??
        "w-full rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-black transition hover:bg-white/90 disabled:opacity-50"
      }
    />
  );
}
