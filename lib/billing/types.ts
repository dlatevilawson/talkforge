export type BillingPlan = "free" | "pro";

export type BillingStatus =
  | "free"
  | "active"
  | "trialing"
  | "past_due"
  | "canceled"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "expired";

export type MemberSubscription = {
  userId: string;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  plan: BillingPlan;
  status: BillingStatus;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  canceledAt: string | null;
  trialEnd: string | null;
  priceId: string | null;
  updatedAt: string | null;
};

export type PracticeEntitlement = {
  canStartPractice: boolean;
  plan: BillingPlan;
  status: BillingStatus;
  reason:
    | "pro"
    | "staff"
    | "free_remaining"
    | "free_limit_reached"
    | "billing_unavailable";
  sessionsUsed: number;
  sessionsLimit: number | null;
  sessionsRemaining: number | null;
  message: string | null;
};

export type MembershipView = {
  plan: BillingPlan;
  status: BillingStatus;
  statusLabel: string;
  renewalLabel: string | null;
  billingCycle: string | null;
  cancelAtPeriodEnd: boolean;
  canUpgrade: boolean;
  canManage: boolean;
  proPriceLabel: string;
  freeLimits: {
    maxPracticeSessions: number;
    maxSessionSeconds: number;
  };
  entitlement: PracticeEntitlement;
  stripeConfigured: boolean;
};
