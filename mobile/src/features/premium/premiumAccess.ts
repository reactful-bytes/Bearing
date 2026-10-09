import { SubscriptionStatus } from './premiumTypes';

export type PremiumFeature = 'premium_overview' | 'ai_goal_builder';

type PremiumPaywallCopy = {
  badge: string;
  headline: string;
  body: string;
  highlights: string[];
};

const PREMIUM_PAYWALL_COPY: PremiumPaywallCopy = {
  badge: 'Bearing 360',
  headline: 'Unlock AI goal planning.',
  body: 'Turn goals into actionable milestones and tasks.',
  highlights: [
    'Use AI to refine your goal into a SMART goal: specific, measurable, achievable, relevant, and time-bound.',
    'AI uses your goal description and planning context to create dated milestones and practical tasks for you.',
    'Review and edit the AI-generated plan to fit your approach.',
  ],
};

export function hasActivePremiumStatus(
  status: SubscriptionStatus | null | undefined,
  periodEndAt?: Date | null,
  now = new Date(),
): boolean {
  const hasActiveStatus = status === 'active' || status === 'in_grace_period';
  return hasActiveStatus && (!periodEndAt || periodEndAt.getTime() > now.getTime());
}

export function getPremiumEntitlementLabel(status: SubscriptionStatus | null | undefined): string {
  switch (status) {
    case 'active':
      return 'Active';
    case 'in_grace_period':
      return 'Grace Period';
    case 'canceled':
      return 'Canceled';
    case 'expired':
      return 'Expired';
    default:
      return 'Free';
  }
}

export function getPremiumPaywallCopy(): PremiumPaywallCopy {
  return PREMIUM_PAYWALL_COPY;
}
