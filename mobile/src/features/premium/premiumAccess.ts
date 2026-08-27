import { SubscriptionStatus } from './premiumTypes';

export type PremiumFeature = 'premium_overview' | 'ai_goal_builder';

type PremiumPaywallCopy = {
  badge: string;
  headline: string;
  body: string;
  highlights: string[];
};

const PREMIUM_PAYWALL_COPY: Record<PremiumFeature, PremiumPaywallCopy> = {
  premium_overview: {
    badge: 'Bearing 360',
    headline: 'Plan bigger with Bearing 360.',
    body: 'Bearing 360 unlocks the AI goal builder assistant while core device calendar access remains free.',
    highlights: [
      'Generate editable milestone and step drafts before saving a goal.',
      'Keep device calendar access available on the free plan.',
      'Use one Bearing 360 membership across iPhone and Android.',
    ],
  },
  ai_goal_builder: {
    badge: 'Bearing 360 Required',
    headline: 'Unlock AI goal planning.',
    body: 'Use Bearing 360 to generate milestone and step drafts for a goal before saving it. Manual planning stays available today.',
    highlights: [
      'Turn one goal into editable milestones and ordered next steps.',
      'Review AI output before anything is written to your saved goals.',
      'Keep the manual wizard as a fallback whenever you want full control.',
    ],
  },
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

export function getPremiumPaywallCopy(feature: PremiumFeature): PremiumPaywallCopy {
  return PREMIUM_PAYWALL_COPY[feature];
}
