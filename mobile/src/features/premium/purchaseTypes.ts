export type PremiumPurchaseAvailability = 'available' | 'expo_go' | 'web' | 'misconfigured';

export type PremiumPlan = {
  packageIdentifier: string;
  telemetryPlanType: string;
  title: string;
  priceText: string;
  priceSuffixText: string | null;
  annualMonthlyBreakdownText: string | null;
  introductoryOfferText: string | null;
  isAutoRenewing: boolean;
  isOneTimePurchase: boolean;
};

export type PremiumPurchaseResult = 'success' | 'cancelled' | 'failure';
