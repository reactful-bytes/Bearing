export type PremiumPlanPeriod = 'monthly' | 'annual';

export type PremiumPurchaseAvailability = 'available' | 'expo_go' | 'web' | 'misconfigured';

export type PremiumPlan = {
  packageIdentifier: string;
  period: PremiumPlanPeriod;
  title: string;
  priceText: string;
  billingPeriodText: string;
  introductoryTermsText: string | null;
};

export type PremiumPurchaseResult = 'success' | 'cancelled' | 'failure';
