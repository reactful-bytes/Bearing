import { Timestamp, getFirestore } from "firebase-admin/firestore";

import {
  AiCreditAccount,
  AiCreditStatus,
  AiCreditSubscription,
  getNextBillingAnniversary,
  reconcileAiCredits,
} from "./aiCredits";
import {
  CallableIdentityRequest,
  requireAuthenticatedCaller,
} from "./security";

export type AiCreditSubscriptionLookup = (
  userId: string,
) => Promise<AiCreditSubscription>;

export type AiCreditReconciler = (
  userId: string,
  subscription: AiCreditSubscription,
  now: Date,
) => Promise<AiCreditAccount | null>;

const SUBSCRIPTION_STATUSES = new Set([
  "active",
  "in_grace_period",
  "expired",
  "canceled",
]);

function storedDate(value: unknown): Date | null {
  return value instanceof Timestamp ? value.toDate() : null;
}

export async function loadAiCreditSubscription(
  userId: string,
): Promise<AiCreditSubscription> {
  const snapshot = await getFirestore().doc(`subscriptions/${userId}`).get();
  const record = snapshot.data();
  const status = record?.status;

  return {
    status: SUBSCRIPTION_STATUSES.has(status)
      ? (status as AiCreditSubscription["status"])
      : null,
    periodStartAt: storedDate(record?.periodStartAt),
    periodEndAt: storedDate(record?.periodEndAt),
  };
}

export async function getAiCreditStatus(
  request: CallableIdentityRequest,
  lookup: AiCreditSubscriptionLookup = loadAiCreditSubscription,
  reconcile: AiCreditReconciler = (userId, subscription, now) =>
    reconcileAiCredits(userId, subscription, now),
  now = new Date(),
): Promise<AiCreditStatus> {
  const caller = requireAuthenticatedCaller(request);
  const subscription = await lookup(caller.uid);
  const account = await reconcile(caller.uid, subscription, now);
  const eligible =
    subscription.status === "active" ||
    subscription.status === "in_grace_period";
  const nextGrant =
    subscription.status === "active" && account
      ? getNextBillingAnniversary(
          subscription.periodStartAt,
          subscription.periodEndAt,
          account.lastGrantedBillingAt,
        )
      : null;

  return {
    eligible,
    availableCredits: account?.availableCredits ?? 0,
    nextGrantAt: nextGrant?.toISOString() ?? null,
  };
}
