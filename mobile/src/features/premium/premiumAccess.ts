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
  body: 'Turn one goal into editable milestones and ordered next steps, while core device calendar access remains free.',
  highlights: [
    'Generate editable milestone and step drafts before saving a goal.',
    'Keep device calendar access available on the free plan.',
    'Use one Bearing 360 membership across iPhone and Android.',
  ],
};

export function hasActivePremiumStatus(status: SubscriptionStatus | null | undefined): boolean {
  return status === 'active' || status === 'in_grace_period';
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
