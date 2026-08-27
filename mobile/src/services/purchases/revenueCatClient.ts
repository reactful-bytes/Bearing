import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Linking, Platform } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { normalizeCreditPacks, normalizePremiumPlans } from '../../features/premium/premiumPlans';
import { SubscriptionPlatform } from '../../features/premium/premiumTypes';
import {
  CreditPack,
  CreditPackPurchaseResult,
  PremiumPlan,
  PremiumPurchaseAvailability,
  PremiumPurchaseResult,
} from '../../features/premium/purchaseTypes';
import { getRevenueCatProductGrantCatalog } from '../firebase/firebaseRevenueCatCatalog';

let configuredUserId: string | null = null;
let premiumPackagesByIdentifier = new Map<string, PurchasesPackage>();
let creditPackPackagesByIdentifier = new Map<string, PurchasesPackage>();

function getApiKey(): string | null {
  const key =
    Platform.OS === 'ios'
      ? process.env.EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
      : Platform.OS === 'android'
        ? process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
        : null;
  return key?.trim() || null;
}

export function getPremiumPurchaseAvailability(): PremiumPurchaseAvailability {
  if (Platform.OS === 'web') return 'web';
  if (Constants.executionEnvironment === ExecutionEnvironment.StoreClient) return 'expo_go';
  return getApiKey() ? 'available' : 'misconfigured';
}

async function getConfiguredPurchases(userId: string) {
  if (getPremiumPurchaseAvailability() !== 'available') {
    throw new Error('Store billing is unavailable in this build.');
  }

  const Purchases = (await import('react-native-purchases')).default;
  if (!(await Purchases.isConfigured())) {
    Purchases.configure({ apiKey: getApiKey()!, appUserID: userId });
    configuredUserId = userId;
  } else if (configuredUserId !== userId) {
    await Purchases.logIn(userId);
    configuredUserId = userId;
  }

  return Purchases;
}

export async function loadPremiumPlans(userId: string): Promise<PremiumPlan[]> {
  const Purchases = await getConfiguredPurchases(userId);
  const [offerings, productGrants] = await Promise.all([
    Purchases.getOfferings(),
    getRevenueCatProductGrantCatalog(),
  ]);
  const offering = offerings.current;
  premiumPackagesByIdentifier = new Map(
    (offering?.availablePackages ?? []).map((storePackage) => [
      storePackage.identifier,
      storePackage,
    ]),
  );
  return normalizePremiumPlans(offering?.availablePackages ?? [], productGrants);
}

export async function loadCreditPacks(userId: string): Promise<CreditPack[]> {
  const Purchases = await getConfiguredPurchases(userId);
  const [offerings, productGrants] = await Promise.all([
    Purchases.getOfferings(),
    getRevenueCatProductGrantCatalog(),
  ]);
  const packages = offerings.all.credit_packs?.availablePackages ?? [];
  creditPackPackagesByIdentifier = new Map(
    packages.map((storePackage) => [storePackage.identifier, storePackage]),
  );
  return normalizeCreditPacks(packages, productGrants);
}

export async function purchasePremiumPlan(
  userId: string,
  packageIdentifier: string,
): Promise<PremiumPurchaseResult> {
  const Purchases = await getConfiguredPurchases(userId);
  const storePackage = premiumPackagesByIdentifier.get(packageIdentifier);
  if (!storePackage) throw new Error('This subscription plan is no longer available.');

  try {
    await Purchases.purchasePackage(storePackage);
    return 'success';
  } catch (error) {
    return Boolean(
      error && typeof error === 'object' && 'userCancelled' in error && error.userCancelled,
    )
      ? 'cancelled'
      : 'failure';
  }
}

export async function purchaseCreditPack(
  userId: string,
  packageIdentifier: string,
): Promise<CreditPackPurchaseResult> {
  const Purchases = await getConfiguredPurchases(userId);
  const storePackage = creditPackPackagesByIdentifier.get(packageIdentifier);
  if (!storePackage) throw new Error('This credit pack is no longer available.');

  try {
    await Purchases.purchasePackage(storePackage);
  } catch (error) {
    return Boolean(
      error && typeof error === 'object' && 'userCancelled' in error && error.userCancelled,
    )
      ? 'cancelled'
      : 'failure';
  }

  try {
    await Purchases.syncPurchases();
    return 'success';
  } catch {
    return 'sync_failure';
  }
}

export async function restorePremiumPurchases(
  userId: string,
): Promise<Exclude<PremiumPurchaseResult, 'cancelled'>> {
  try {
    const Purchases = await getConfiguredPurchases(userId);
    await Purchases.restorePurchases();
    return 'success';
  } catch {
    return 'failure';
  }
}

export function getWebSubscriptionManagementUrl(
  subscriptionPlatform: SubscriptionPlatform | null,
): string | null {
  if (subscriptionPlatform === 'ios') return 'https://apps.apple.com/account/subscriptions';
  if (subscriptionPlatform === 'android') {
    return 'https://play.google.com/store/account/subscriptions';
  }
  return null;
}

export async function showPremiumSubscriptionManagement(
  userId: string,
  subscriptionPlatform: SubscriptionPlatform | null = null,
): Promise<void> {
  if (Platform.OS === 'web') {
    const managementUrl = getWebSubscriptionManagementUrl(subscriptionPlatform);
    if (!managementUrl) {
      throw new Error('The subscription store could not be determined.');
    }
    await Linking.openURL(managementUrl);
    return;
  }

  const Purchases = await getConfiguredPurchases(userId);
  await Purchases.showManageSubscriptions();
}
