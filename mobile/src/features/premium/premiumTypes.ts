export type SubscriptionPlatform = 'ios' | 'android' | 'web';

export type SubscriptionStatus = 'active' | 'in_grace_period' | 'expired' | 'canceled';

export type PremiumEntitlementRecord = {
  userId: string;
  platform: SubscriptionPlatform;
  revenueCatStore?: string;
  productId: string;
  status: SubscriptionStatus;
  periodStartAt: Date | null;
  periodEndAt: Date | null;
  autoRenew: boolean;
  lastValidatedAt: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
};

export type PremiumEntitlementUiState = 'loading' | 'ready' | 'error';
