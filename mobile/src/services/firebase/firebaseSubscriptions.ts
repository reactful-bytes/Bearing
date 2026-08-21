import {
  DocumentData,
  DocumentSnapshot,
  Firestore,
  Timestamp,
  Unsubscribe,
  doc,
  getFirestore,
  onSnapshot,
} from 'firebase/firestore';

import {
  PremiumEntitlementRecord,
  SubscriptionPlatform,
  SubscriptionStatus,
} from '../../features/premium/premiumTypes';
import { getFirebaseApp } from './firebaseApp';

let cachedDb: Firestore | null = null;

const SUBSCRIPTION_PLATFORMS = new Set<SubscriptionPlatform>(['ios', 'android', 'web']);
const SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  'active',
  'in_grace_period',
  'expired',
  'canceled',
]);

function getFirebaseFirestore(): Firestore {
  if (!cachedDb) {
    cachedDb = getFirestore(getFirebaseApp());
  }

  return cachedDb;
}

function timestampToDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

function parsePlatform(value: unknown): SubscriptionPlatform {
  return SUBSCRIPTION_PLATFORMS.has(value as SubscriptionPlatform)
    ? (value as SubscriptionPlatform)
    : 'web';
}

function parseStatus(value: unknown): SubscriptionStatus {
  return SUBSCRIPTION_STATUSES.has(value as SubscriptionStatus)
    ? (value as SubscriptionStatus)
    : 'expired';
}

function docToPremiumEntitlement(
  snapshot: DocumentSnapshot<DocumentData>,
): PremiumEntitlementRecord {
  const data = snapshot.data();

  if (!data) {
    throw new Error('Subscription document was not found.');
  }

  return {
    userId: snapshot.id,
    platform: parsePlatform(data.platform),
    revenueCatStore: typeof data.revenueCatStore === 'string' ? data.revenueCatStore : undefined,
    productId: typeof data.productId === 'string' ? data.productId : '',
    status: parseStatus(data.status),
    periodStartAt: timestampToDate(data.periodStartAt),
    periodEndAt: timestampToDate(data.periodEndAt),
    autoRenew: data.autoRenew === true,
    lastValidatedAt: timestampToDate(data.lastValidatedAt),
    createdAt: timestampToDate(data.createdAt),
    updatedAt: timestampToDate(data.updatedAt),
  };
}

export function subscribeToPremiumEntitlement(
  userId: string,
  onNext: (entitlement: PremiumEntitlementRecord | null) => void,
  onError: (error: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getFirebaseFirestore(), 'subscriptions', userId),
    (snapshot) => {
      onNext(snapshot.exists() ? docToPremiumEntitlement(snapshot) : null);
    },
    (firestoreError) => {
      onError(new Error('Failed to load premium access.', { cause: firestoreError }));
    },
  );
}
