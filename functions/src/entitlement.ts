import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

import {
  CallableIdentityRequest,
  VerifiedCaller,
  requireVerifiedCaller,
} from "./security";

export type SubscriptionStatus =
  "active" | "in_grace_period" | "expired" | "canceled";

export type PremiumCaller = VerifiedCaller & {
  subscriptionStatus: "active" | "in_grace_period";
};

export type EntitlementLookup = (
  userId: string,
) => Promise<SubscriptionStatus | null>;

const SUBSCRIPTION_STATUSES = new Set<SubscriptionStatus>([
  "active",
  "in_grace_period",
  "expired",
  "canceled",
]);

export async function loadSubscriptionStatus(
  userId: string,
): Promise<SubscriptionStatus | null> {
  const snapshot = await getFirestore().doc(`subscriptions/${userId}`).get();

  if (!snapshot.exists) {
    return null;
  }

  const status = snapshot.data()?.status;
  return SUBSCRIPTION_STATUSES.has(status as SubscriptionStatus)
    ? (status as SubscriptionStatus)
    : null;
}

export async function requirePremiumCaller(
  request: CallableIdentityRequest,
  lookup: EntitlementLookup = loadSubscriptionStatus,
): Promise<PremiumCaller> {
  const caller = requireVerifiedCaller(request);
  const subscriptionStatus = await lookup(caller.uid);

  if (
    subscriptionStatus !== "active" &&
    subscriptionStatus !== "in_grace_period"
  ) {
    throw new HttpsError(
      "permission-denied",
      "An active premium subscription is required.",
    );
  }

  return { ...caller, subscriptionStatus };
}
