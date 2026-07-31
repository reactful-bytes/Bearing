import { PremiumPlan, PremiumPlanPeriod } from './purchaseTypes';

export type StorePackageSummary = {
  identifier: string;
  packageType: string;
  product: {
    priceString: string;
    subscriptionPeriod: string | null;
    introPrice: {
      priceString: string;
      cycles: number;
      periodUnit: string;
      periodNumberOfUnits: number;
    } | null;
  };
};

function getPlanPeriod(
  packageType: string,
  subscriptionPeriod: string | null,
): PremiumPlanPeriod | null {
  if (packageType === 'MONTHLY' || subscriptionPeriod === 'P1M') return 'monthly';
  if (packageType === 'ANNUAL' || subscriptionPeriod === 'P1Y') return 'annual';
  return null;
}

function getIntroductoryTerms(storePackage: StorePackageSummary): string | null {
  const intro = storePackage.product.introPrice;
  if (!intro) return null;

  const unit = intro.periodUnit.toLowerCase();
  const duration = intro.periodNumberOfUnits * intro.cycles;
  const unitLabel = `${unit}${duration === 1 ? '' : 's'}`;
  return intro.priceString === '0' || Number(intro.priceString.replace(/[^0-9.]/g, '')) === 0
    ? `${duration} ${unitLabel} free, then ${storePackage.product.priceString}.`
    : `${intro.priceString} for ${duration} ${unitLabel}, then ${storePackage.product.priceString}.`;
}

export function normalizePremiumPlans(packages: StorePackageSummary[]): PremiumPlan[] {
  return packages
    .map((storePackage): PremiumPlan | null => {
      const period = getPlanPeriod(
        storePackage.packageType,
        storePackage.product.subscriptionPeriod,
      );
      if (!period) return null;

      return {
        packageIdentifier: storePackage.identifier,
        period,
        title: period === 'monthly' ? 'Monthly' : 'Annual',
        priceText: storePackage.product.priceString,
        billingPeriodText: period === 'monthly' ? 'per month' : 'per year',
        introductoryTermsText: getIntroductoryTerms(storePackage),
      };
    })
    .filter((plan): plan is PremiumPlan => plan !== null)
    .sort((left, right) => (left.period === 'monthly' && right.period === 'annual' ? -1 : 1));
}
