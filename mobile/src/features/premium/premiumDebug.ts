import { PremiumEntitlementRecord } from './premiumTypes';
import { PremiumPlan } from './purchaseTypes';

export type PremiumDebugMode = 'off' | 'profile';
export type PremiumDebugAccessMode = 'revenuecat' | 'premium' | 'free';

function getDebugMode(): PremiumDebugMode {
  if (!__DEV__ || process.env.EXPO_PUBLIC_APP_ENV === 'production') return 'off';
  const mode = process.env.EXPO_PUBLIC_DEVELOPER_MODE;
  return mode === 'profile' ? mode : 'off';
}

const debugMode = getDebugMode();
let debugAccessEnabled = false;
let debugAccessMode: PremiumDebugAccessMode = 'revenuecat';
let debugLocalPlansEnabled = false;
let debugAccessPlanType: 'monthly' | 'annual' = 'monthly';
const listeners = new Set<() => void>();

export function isPremiumDebugEnabled(): boolean {
  return debugMode !== 'off';
}

export function isPremiumDebugAccessEnabled(): boolean {
  return isPremiumDebugEnabled() && debugAccessEnabled;
}

export function getPremiumDebugAccessMode(): PremiumDebugAccessMode {
  return isPremiumDebugEnabled() ? debugAccessMode : 'revenuecat';
}

export function isPremiumDebugLocalPlansEnabled(): boolean {
  return isPremiumDebugEnabled() && debugLocalPlansEnabled;
}

export function subscribeToPremiumDebugAccess(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function setPremiumDebugAccess(enabled: boolean, plan?: PremiumPlan): void {
  if (!isPremiumDebugEnabled()) return;
  if (plan) {
    debugAccessPlanType = plan.telemetryPlanType === 'ANNUAL' ? 'annual' : 'monthly';
  }
  setPremiumDebugAccessMode(enabled ? 'premium' : 'revenuecat');
}

export function setPremiumDebugAccessMode(mode: PremiumDebugAccessMode): void {
  if (!isPremiumDebugEnabled() || debugAccessMode === mode) return;
  debugAccessMode = mode;
  debugAccessEnabled = mode === 'premium';
  listeners.forEach((listener) => listener());
}

export function setPremiumDebugLocalPlansEnabled(enabled: boolean): void {
  if (!isPremiumDebugEnabled() || debugLocalPlansEnabled === enabled) return;
  debugLocalPlansEnabled = enabled;
  listeners.forEach((listener) => listener());
}

export function getPremiumDebugPlans(): PremiumPlan[] {
  return [
    {
      packageIdentifier: 'debug_monthly',
      telemetryPlanType: 'MONTHLY',
      creditAmount: 10,
      trialCreditAmount: 1,
      title: 'Monthly',
      priceText: '$0.00',
      priceSuffixText: '/mo',
      annualMonthlyBreakdownText: null,
      introductoryOfferText: 'Local debug plan',
      isAutoRenewing: true,
      isOneTimePurchase: false,
    },
    {
      packageIdentifier: 'debug_annual',
      telemetryPlanType: 'ANNUAL',
      creditAmount: 10,
      trialCreditAmount: 1,
      title: 'Yearly',
      priceText: '$0.00',
      priceSuffixText: '/yr',
      annualMonthlyBreakdownText: 'Local debug plan',
      introductoryOfferText: null,
      isAutoRenewing: true,
      isOneTimePurchase: false,
    },
  ];
}

export function getPremiumDebugEntitlement(userId: string): PremiumEntitlementRecord | null {
  if (getPremiumDebugAccessMode() !== 'premium') return null;
  const now = new Date();
  const renewalDate = new Date(now);
  if (debugAccessPlanType === 'annual') {
    renewalDate.setFullYear(renewalDate.getFullYear() + 1);
  } else {
    renewalDate.setMonth(renewalDate.getMonth() + 1);
  }
  return {
    userId,
    platform: 'web',
    revenueCatStore: 'debug',
    productId: 'debug_premium',
    status: 'active',
    periodStartAt: now,
    periodEndAt: renewalDate,
    autoRenew: true,
    lastValidatedAt: now,
    createdAt: now,
    updatedAt: now,
  };
}
