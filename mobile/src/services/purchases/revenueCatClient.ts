import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Linking, Platform } from 'react-native';
import type { PurchasesPackage } from 'react-native-purchases';

import { normalizePremiumPlans } from '../../features/premium/premiumPlans';
import { SubscriptionPlatform } from '../../features/premium/premiumTypes';
import {
  PremiumPlan,
  PremiumPurchaseAvailability,
  PremiumPurchaseResult,
} from '../../features/premium/purchaseTypes';

let configuredUserId: string | null = null;
let packagesByIdentifier = new Map<string, PurchasesPackage>();

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
  const offering = (await Purchases.getOfferings()).current;
  packagesByIdentifier = new Map(
    (offering?.availablePackages ?? []).map((storePackage) => [
      storePackage.identifier,
      storePackage,
    ]),
  );
  return normalizePremiumPlans(offering?.availablePackages ?? []);
}

export async function purchasePremiumPlan(
  userId: string,
  packageIdentifier: string,
): Promise<PremiumPurchaseResult> {
  const Purchases = await getConfiguredPurchases(userId);
  const storePackage = packagesByIdentifier.get(packageIdentifier);
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
