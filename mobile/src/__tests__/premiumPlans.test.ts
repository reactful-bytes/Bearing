import { describe, expect, it } from '@jest/globals';

import { normalizePremiumPlans, StorePackageSummary } from '../features/premium/premiumPlans';

function makePackage(
  packageType: string,
  subscriptionPeriod: string,
  priceString: string,
): StorePackageSummary {
  return {
    identifier: `$rc_${packageType.toLowerCase()}`,
    packageType,
    product: { priceString, subscriptionPeriod, introPrice: null },
  };
}

describe('premium plans', () => {
  it('normalizes monthly and annual store packages in display order', () => {
    const plans = normalizePremiumPlans([
      makePackage('ANNUAL', 'P1Y', '$59.99'),
      makePackage('MONTHLY', 'P1M', '$7.99'),
      makePackage('WEEKLY', 'P1W', '$2.99'),
    ]);

    expect(plans).toEqual([
      expect.objectContaining({ period: 'monthly', priceText: '$7.99' }),
      expect.objectContaining({ period: 'annual', priceText: '$59.99' }),
    ]);
  });

  it('describes introductory terms using store-provided values', () => {
    const storePackage = makePackage('MONTHLY', 'P1M', '$7.99');
    storePackage.product.introPrice = {
      priceString: '$0.00',
      cycles: 1,
      periodUnit: 'WEEK',
      periodNumberOfUnits: 1,
    };

    expect(normalizePremiumPlans([storePackage])[0].introductoryTermsText).toBe(
      '1 week free, then $7.99.',
    );
  });
});
