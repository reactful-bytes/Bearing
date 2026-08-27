export type PremiumPurchaseAvailability = 'available' | 'expo_go' | 'web' | 'misconfigured';

export type PremiumPlan = {
  packageIdentifier: string;
  telemetryPlanType: string;
  creditAmount: number | null;
  trialCreditAmount: number | null;
  title: string;
  priceText: string;
  priceSuffixText: string | null;
  annualMonthlyBreakdownText: string | null;
  introductoryOfferText: string | null;
  isAutoRenewing: boolean;
  isOneTimePurchase: boolean;
};

export type PremiumPurchaseResult = 'success' | 'cancelled' | 'failure';
export type CreditPackPurchaseResult = PremiumPurchaseResult | 'sync_failure';
export type CreditPackSource = 'ai_planning' | 'profile';

export type CreditPack = {
  packageIdentifier: string;
  amount: number;
  currencyCode: string;
  priceText: string;
};
