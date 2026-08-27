import { CreditPack, PremiumPlan } from './purchaseTypes';

export type StorePackageSummary = {
  identifier: string;
  packageType: string;
  product: {
    identifier: string;
    title: string;
    productType: string;
    priceString: string;
    pricePerMonthString: string | null;
    subscriptionPeriod: string | null;
    introPrice: {
      priceString: string;
      cycles: number;
      periodUnit: string;
      periodNumberOfUnits: number;
    } | null;
  };
};

export type ProductGrantSummary = {
  storeProductId: string;
  currencyCode?: string;
  amount: number;
  trialAmount: number | null;
};

type PlanPeriodDetails = {
  fallbackTitle: string;
  priceSuffixText: string | null;
  isAutoRenewing: boolean;
  isOneTimePurchase: boolean;
};

const PERIOD_UNITS = {
  D: 'day',
  W: 'week',
  M: 'month',
  Y: 'year',
} as const;

const PRICE_PERIOD_UNITS = {
  D: 'day',
  W: 'wk',
  M: 'mo',
  Y: 'yr',
} as const;

function getSubscriptionPeriodDetails(subscriptionPeriod: string): PlanPeriodDetails | null {
  const match = /^P(\d+)([DWMY])$/.exec(subscriptionPeriod);
  if (!match) return null;

  const quantity = Number(match[1]);
  const unit = PERIOD_UNITS[match[2] as keyof typeof PERIOD_UNITS];
  const unitLabel = `${unit}${quantity === 1 ? '' : 's'}`;
  const interval = quantity === 1 ? unit : `${quantity} ${unitLabel}`;
  const pricePeriodUnit = PRICE_PERIOD_UNITS[match[2] as keyof typeof PRICE_PERIOD_UNITS];
  const fallbackTitle =
    quantity === 1
      ? ({ D: 'Daily', W: 'Weekly', M: 'Monthly', Y: 'Annual' } as const)[
          match[2] as keyof typeof PERIOD_UNITS
        ]
      : `Every ${interval}`;

  return {
    fallbackTitle,
    priceSuffixText: `/${quantity === 1 ? '' : `${quantity} `}${pricePeriodUnit}`,
    isAutoRenewing: false,
    isOneTimePurchase: false,
  };
}

function getPlanPeriodDetails(storePackage: StorePackageSummary): PlanPeriodDetails {
  const subscriptionPeriod = storePackage.product.subscriptionPeriod;
  if (subscriptionPeriod) {
    const details = getSubscriptionPeriodDetails(subscriptionPeriod);
    if (details) {
      return {
        ...details,
        isAutoRenewing: storePackage.product.productType === 'AUTO_RENEWABLE_SUBSCRIPTION',
      };
    }
  }

  if (
    storePackage.packageType === 'LIFETIME' ||
    storePackage.product.productType === 'NON_CONSUMABLE'
  ) {
    return {
      fallbackTitle: 'Lifetime',
      priceSuffixText: null,
      isAutoRenewing: false,
      isOneTimePurchase: true,
    };
  }

  if (storePackage.product.productType === 'AUTO_RENEWABLE_SUBSCRIPTION') {
    return {
      fallbackTitle: 'Bearing 360',
      priceSuffixText: null,
      isAutoRenewing: true,
      isOneTimePurchase: false,
    };
  }

  return {
    fallbackTitle: 'Bearing 360',
    priceSuffixText: null,
    isAutoRenewing: false,
    isOneTimePurchase: false,
  };
}

function getIntroductoryOfferText(storePackage: StorePackageSummary): string | null {
  const intro = storePackage.product.introPrice;
  if (!intro) return null;

  const unit = intro.periodUnit.toLowerCase();
  const duration = intro.periodNumberOfUnits * intro.cycles;
  const unitLabel = `${unit}${duration === 1 ? '' : 's'}`;
  return intro.priceString === '0' || Number(intro.priceString.replace(/[^0-9.]/g, '')) === 0
    ? `${duration} ${unitLabel} free`
    : `${intro.priceString} for ${duration} ${unitLabel}`;
}

function getAnnualMonthlyBreakdownText(storePackage: StorePackageSummary): string | null {
  if (storePackage.product.subscriptionPeriod !== 'P1Y') return null;
  const monthlyPrice = storePackage.product.pricePerMonthString?.trim();
  return monthlyPrice ? `Only ${monthlyPrice}/mo` : null;
}

function getCustomerFacingPlanTitle(
  storePackage: StorePackageSummary,
  fallbackTitle: string,
): string {
  const title = storePackage.product.title.trim();
  const isTechnicalTitle =
    /^P\d+[DWMY]$/i.test(title) || title.startsWith('$rc_') || title.includes('_');
  return title && !isTechnicalTitle ? title.replace(/\bpremium\b/gi, 'Bearing 360') : fallbackTitle;
}

export function normalizePremiumPlans(
  packages: StorePackageSummary[],
  productGrants: ProductGrantSummary[] = [],
): PremiumPlan[] {
  const grantsByStoreProductId = new Map(
    productGrants.map((grant) => [grant.storeProductId, grant]),
  );
  return packages.map((storePackage): PremiumPlan => {
    const periodDetails = getPlanPeriodDetails(storePackage);
    const productGrant = grantsByStoreProductId.get(storePackage.product.identifier);
    return {
      packageIdentifier: storePackage.identifier,
      telemetryPlanType: storePackage.packageType,
      creditAmount: productGrant?.amount ?? null,
      trialCreditAmount: productGrant?.trialAmount ?? null,
      title: getCustomerFacingPlanTitle(storePackage, periodDetails.fallbackTitle),
      priceText: storePackage.product.priceString,
      priceSuffixText: periodDetails.priceSuffixText,
      annualMonthlyBreakdownText: periodDetails.isAutoRenewing
        ? getAnnualMonthlyBreakdownText(storePackage)
        : null,
      introductoryOfferText: getIntroductoryOfferText(storePackage),
      isAutoRenewing: periodDetails.isAutoRenewing,
      isOneTimePurchase: periodDetails.isOneTimePurchase,
    };
  });
}

export function normalizeCreditPacks(
  packages: StorePackageSummary[],
  productGrants: ProductGrantSummary[],
): CreditPack[] {
  const grantsByStoreProductId = new Map(
    productGrants.map((grant) => [grant.storeProductId, grant]),
  );

  return packages.flatMap((storePackage) => {
    const productGrant = grantsByStoreProductId.get(storePackage.product.identifier);
    if (!productGrant) return [];

    return [
      {
        packageIdentifier: storePackage.identifier,
        amount: productGrant.amount,
        currencyCode: productGrant.currencyCode ?? '',
        priceText: storePackage.product.priceString,
      },
    ];
  });
}
