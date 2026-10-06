import { Timestamp, getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

import {
  AuthenticatedCaller,
  CallableIdentityRequest,
  requireAuthenticatedCaller,
} from "./security";

export type SubscriptionStatus =
  "active" | "in_grace_period" | "expired" | "canceled";

export type PremiumCaller = AuthenticatedCaller & {
  subscriptionStatus: "active" | "in_grace_period";
};

export type EntitlementLookup = (
  userId: string,
) => Promise<SubscriptionStatus | null>;

export function getEffectiveSubscriptionStatus(
  status: SubscriptionStatus | null,
  periodEndAt: Date | null,
  now = new Date(),
): SubscriptionStatus | null {
  if (
    (status === "active" || status === "in_grace_period") &&
    periodEndAt &&
    periodEndAt.getTime() <= now.getTime()
  ) {
    return "expired";
  }
  return status;
}

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

  const record = snapshot.data();
  const status = record?.status;
  const validStatus = SUBSCRIPTION_STATUSES.has(status as SubscriptionStatus)
    ? (status as SubscriptionStatus)
    : null;
  const periodEndAt =
    record?.periodEndAt instanceof Timestamp
      ? record.periodEndAt.toDate()
      : null;
  return getEffectiveSubscriptionStatus(validStatus, periodEndAt);
}

export async function requirePremiumCaller(
  request: CallableIdentityRequest,
  lookup: EntitlementLookup = loadSubscriptionStatus,
): Promise<PremiumCaller> {
  const caller = requireAuthenticatedCaller(request);
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
