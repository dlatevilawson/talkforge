import { redirect } from "next/navigation";

/** Pricing → Membership (BILL-001 / IV-PROD-008). */
export default function PricingPage() {
  redirect("/membership");
}
