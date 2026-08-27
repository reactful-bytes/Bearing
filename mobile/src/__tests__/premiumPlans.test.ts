import { describe, expect, it } from '@jest/globals';

import {
  normalizeCreditPacks,
  normalizePremiumPlans,
  StorePackageSummary,
} from '../features/premium/premiumPlans';

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
      identifier: `bearing_${packageType.toLowerCase()}`,
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
  it('builds credit packs only when the dedicated offering product has a server grant', () => {
    expect(
      normalizeCreditPacks(
        [makePackage('CUSTOM', null, '$4.99'), makePackage('LIFETIME', null, '$8.99')],
        [
          {
            storeProductId: 'bearing_custom',
            amount: 5,
            trialAmount: null,
            currencyCode: 'AIC',
          },
        ],
      ),
    ).toEqual([
      {
        packageIdentifier: '$rc_custom',
        amount: 5,
        currencyCode: 'AIC',
        priceText: '$4.99',
      },
    ]);
  });

  it('joins server grants to packages by store product identifier without a numeric fallback', () => {
    const monthlyPackage = makePackage('MONTHLY', 'P1M', '$7.99');
    const annualPackage = makePackage('ANNUAL', 'P1Y', '$59.99');

    expect(
      normalizePremiumPlans(
        [monthlyPackage, annualPackage],
        [
          {
            storeProductId: 'bearing_monthly',
            amount: 8,
            trialAmount: 2,
          },
        ],
      ),
    ).toEqual([
      expect.objectContaining({ creditAmount: 8, trialCreditAmount: 2 }),
      expect.objectContaining({ creditAmount: null, trialCreditAmount: null }),
    ]);
  });

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
        title: 'ANNUAL Bearing 360',
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
        title: 'Bearing 360 Flex',
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
