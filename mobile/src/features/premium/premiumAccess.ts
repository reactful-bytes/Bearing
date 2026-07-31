import { PremiumStatus } from '../profile/profileTypes';

export type PremiumFeature = 'premium_overview' | 'ai_goal_builder';

type PremiumPaywallCopy = {
  badge: string;
  headline: string;
  body: string;
  highlights: string[];
};

const PREMIUM_PAYWALL_COPY: Record<PremiumFeature, PremiumPaywallCopy> = {
  premium_overview: {
    badge: 'Premium Preview',
    headline: 'Plan bigger with Bearing Premium.',
    body: 'Premium unlocks the AI goal builder assistant while core device calendar access remains free.',
    highlights: [
      'Generate editable milestone and step drafts before saving a goal.',
      'Keep device calendar access available on the free plan.',
      'Use one premium entitlement across iPhone and Android after live billing is connected.',
    ],
  },
  ai_goal_builder: {
    badge: 'Premium Required',
    headline: 'Unlock AI goal planning.',
    body: 'Use Premium to generate milestone and step drafts for a goal before saving it. Manual planning stays available today.',
    highlights: [
      'Turn one goal into editable milestones and ordered next steps.',
      'Review AI output before anything is written to your saved goals.',
      'Keep the manual wizard as a fallback whenever you want full control.',
    ],
  },
};

export function hasActivePremiumStatus(status: PremiumStatus | null | undefined): boolean {
  return status === 'premium' || status === 'grace_period';
}

export function getPremiumEntitlementLabel(status: PremiumStatus | null | undefined): string {
  switch (status) {
    case 'premium':
      return 'Active';
    case 'grace_period':
      return 'Grace Period';
    case 'canceled':
      return 'Canceled';
    case 'free':
    default:
      return 'Free';
  }
}

export function getPremiumPaywallCopy(feature: PremiumFeature): PremiumPaywallCopy {
  return PREMIUM_PAYWALL_COPY[feature];
}
