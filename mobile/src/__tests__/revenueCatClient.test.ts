import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import type { PurchasesPackage } from 'react-native-purchases';

import { getRevenueCatProductGrantCatalog } from '../services/firebase/firebaseRevenueCatCatalog';
import {
  getWebSubscriptionManagementUrl,
  loadCreditPacks,
  loadPremiumPlans,
  purchaseCreditPack,
  purchasePremiumPlan,
} from '../services/purchases/revenueCatClient';

type MockOfferings = {
  current: { availablePackages: PurchasesPackage[] };
  all: { credit_packs: { availablePackages: PurchasesPackage[] } };
};

const mockPurchases = {
  configure: jest.fn(),
  getOfferings: jest.fn<() => Promise<MockOfferings>>(),
  isConfigured: jest.fn(async () => true),
  logIn: jest.fn(async () => undefined),
  purchasePackage: jest.fn(async (_storePackage: PurchasesPackage) => undefined),
  syncPurchases: jest.fn(async () => undefined),
};

jest.mock('react-native-purchases', () => mockPurchases);

jest.mock('../services/firebase/firebaseRevenueCatCatalog', () => ({
  getRevenueCatProductGrantCatalog: jest.fn(),
}));

function makePackage(
  packageIdentifier: string,
  productIdentifier: string,
  productType: 'AUTO_RENEWABLE_SUBSCRIPTION' | 'CONSUMABLE',
  priceString: string,
): PurchasesPackage {
  return {
    identifier: packageIdentifier,
    packageType: productType === 'CONSUMABLE' ? 'CUSTOM' : 'MONTHLY',
    product: {
      identifier: productIdentifier,
      title: productIdentifier,
      productType,
      priceString,
      pricePerMonthString: null,
      subscriptionPeriod: productType === 'CONSUMABLE' ? null : 'P1M',
      introPrice: null,
    },
  } as unknown as PurchasesPackage;
}

const subscriptionPackage = makePackage(
  '$rc_monthly',
  'bearing_360_monthly',
  'AUTO_RENEWABLE_SUBSCRIPTION',
  '$7.99',
);
const creditPackPackage = makePackage('credits_5', 'bearing_credits_5', 'CONSUMABLE', '$4.99');

describe('RevenueCat offering isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY = 'test-ios-key';
    process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY = 'test-android-key';
    mockPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [subscriptionPackage] },
      all: { credit_packs: { availablePackages: [creditPackPackage] } },
    });
    jest.mocked(getRevenueCatProductGrantCatalog).mockResolvedValue([
      {
        storeProductId: 'bearing_360_monthly',
        productType: 'subscription',
        currencyCode: 'AIC',
        amount: 10,
        trialAmount: 2,
        expiresAtCycleEnd: false,
      },
      {
        storeProductId: 'bearing_credits_5',
        productType: 'consumable',
        currencyCode: 'AIC',
        amount: 5,
        trialAmount: null,
        expiresAtCycleEnd: false,
      },
    ]);
  });

  it('joins grants by store product ID and omits credit packs without grants', async () => {
    const unmatchedPack = makePackage(
      'credits_unknown',
      'bearing_credits_unknown',
      'CONSUMABLE',
      '$8.99',
    );
    mockPurchases.getOfferings.mockResolvedValue({
      current: { availablePackages: [subscriptionPackage] },
      all: {
        credit_packs: { availablePackages: [creditPackPackage, unmatchedPack] },
      },
    });

    await expect(loadPremiumPlans('user-1')).resolves.toEqual([
      expect.objectContaining({ creditAmount: 10, trialCreditAmount: 2 }),
    ]);
    await expect(loadCreditPacks('user-1')).resolves.toEqual([
      {
        packageIdentifier: 'credits_5',
        amount: 5,
        currencyCode: 'AIC',
        priceText: '$4.99',
      },
    ]);
  });

  it('does not allow subscription packages through the credit-pack purchase path', async () => {
    await loadPremiumPlans('user-1');
    await loadCreditPacks('user-1');

    await expect(purchaseCreditPack('user-1', '$rc_monthly')).rejects.toThrow(
      'This credit pack is no longer available.',
    );
    expect(mockPurchases.purchasePackage).not.toHaveBeenCalled();
  });

  it('does not allow credit-pack packages through subscription activation', async () => {
    await loadPremiumPlans('user-1');
    await loadCreditPacks('user-1');

    await expect(purchasePremiumPlan('user-1', 'credits_5')).rejects.toThrow(
      'This subscription plan is no longer available.',
    );
    expect(mockPurchases.purchasePackage).not.toHaveBeenCalled();
  });

  it.each<[unknown, 'cancelled' | 'failure']>([
    [{ userCancelled: true }, 'cancelled'],
    [new Error('store failed'), 'failure'],
  ])('returns %s as %s', async (purchaseError, expectedResult) => {
    await loadCreditPacks('user-1');
    mockPurchases.purchasePackage.mockRejectedValueOnce(purchaseError);

    await expect(purchaseCreditPack('user-1', 'credits_5')).resolves.toBe(expectedResult);
    expect(mockPurchases.syncPurchases).not.toHaveBeenCalled();
  });

  it('returns success after purchasing and syncing the credit pack', async () => {
    await loadCreditPacks('user-1');

    await expect(purchaseCreditPack('user-1', 'credits_5')).resolves.toBe('success');
    expect(mockPurchases.purchasePackage).toHaveBeenCalledWith(creditPackPackage);
    expect(mockPurchases.syncPurchases).toHaveBeenCalledTimes(1);
  });

  it('returns sync_failure when the store purchase succeeds but synchronization fails', async () => {
    await loadCreditPacks('user-1');
    mockPurchases.syncPurchases.mockRejectedValueOnce(new Error('sync failed'));

    await expect(purchaseCreditPack('user-1', 'credits_5')).resolves.toBe('sync_failure');
  });
});

describe('web subscription management', () => {
  it('routes Apple subscriptions to Apple account management', () => {
    expect(getWebSubscriptionManagementUrl('ios')).toBe(
      'https://apps.apple.com/account/subscriptions',
    );
  });

  it('routes Android subscriptions to Google Play account management', () => {
    expect(getWebSubscriptionManagementUrl('android')).toBe(
      'https://play.google.com/store/account/subscriptions',
    );
  });

  it('does not offer cancellation when the originating store is unknown', () => {
    expect(getWebSubscriptionManagementUrl('web')).toBeNull();
    expect(getWebSubscriptionManagementUrl(null)).toBeNull();
  });
});
