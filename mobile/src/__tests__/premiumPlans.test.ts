import { describe, expect, it } from '@jest/globals';

import { normalizePremiumPlans, StorePackageSummary } from '../features/premium/premiumPlans';

function makePackage(
  packageType: string,
  subscriptionPeriod: string | null,
  priceString: string,
  pricePerMonthString: string | null = null,
): StorePackageSummary {
  return {
    identifier: `$rc_${packageType.toLowerCase()}`,
    packageType,
    product: {
      title: `${packageType} Premium`,
      productType: subscriptionPeriod ? 'AUTO_RENEWABLE_SUBSCRIPTION' : 'NON_CONSUMABLE',
      priceString,
      pricePerMonthString,
      subscriptionPeriod,
      introPrice: null,
    },
  };
}

describe('premium plans', () => {
  it('normalizes every RevenueCat offering package in its supplied display order', () => {
    const plans = normalizePremiumPlans([
      makePackage('ANNUAL', 'P1Y', '$59.99', '$5.00'),
      makePackage('WEEKLY', 'P1W', '$2.99'),
      makePackage('THREE_MONTH', 'P3M', '$19.99'),
      makePackage('LIFETIME', null, '$99.99'),
    ]);

    expect(plans).toEqual([
      expect.objectContaining({
        telemetryPlanType: 'ANNUAL',
        title: 'ANNUAL Premium',
        priceText: '$59.99',
        priceSuffixText: '/yr',
        annualMonthlyBreakdownText: 'Only $5.00/mo',
        isAutoRenewing: true,
        isOneTimePurchase: false,
      }),
      expect.objectContaining({
        telemetryPlanType: 'WEEKLY',
        priceText: '$2.99',
        priceSuffixText: '/wk',
        annualMonthlyBreakdownText: null,
        isAutoRenewing: true,
        isOneTimePurchase: false,
      }),
      expect.objectContaining({
        telemetryPlanType: 'THREE_MONTH',
        priceText: '$19.99',
        priceSuffixText: '/3 mo',
        isAutoRenewing: true,
        isOneTimePurchase: false,
      }),
      expect.objectContaining({
        telemetryPlanType: 'LIFETIME',
        priceText: '$99.99',
        priceSuffixText: null,
        isAutoRenewing: false,
        isOneTimePurchase: true,
      }),
    ]);
  });

  it('retains custom packages when RevenueCat does not provide a recognizable period', () => {
    const storePackage = makePackage('CUSTOM', null, '$12.99');
    storePackage.product.title = 'Premium Flex';
    storePackage.product.productType = 'AUTO_RENEWABLE_SUBSCRIPTION';

    expect(normalizePremiumPlans([storePackage])[0]).toEqual(
      expect.objectContaining({
        telemetryPlanType: 'CUSTOM',
        title: 'Premium Flex',
        priceText: '$12.99',
        priceSuffixText: null,
        isAutoRenewing: true,
        isOneTimePurchase: false,
      }),
    );
  });

  it('falls back to a readable cadence when a store title looks like a product identifier', () => {
    const storePackage = makePackage('ANNUAL', 'P1Y', '$59.99');
    storePackage.product.title = 'bearing_premium_annual';

    expect(normalizePremiumPlans([storePackage])[0].title).toBe('Annual');
  });

  it('uses compact recurring prices and concise introductory offers from the store', () => {
    const storePackage = makePackage('MONTHLY', 'P1M', '$7.99');
    storePackage.product.introPrice = {
      priceString: '$0.00',
      cycles: 1,
      periodUnit: 'WEEK',
      periodNumberOfUnits: 1,
    };

    expect(normalizePremiumPlans([storePackage])[0]).toEqual(
      expect.objectContaining({
        priceSuffixText: '/mo',
        annualMonthlyBreakdownText: null,
        introductoryOfferText: '1 week free',
      }),
    );
  });
});
