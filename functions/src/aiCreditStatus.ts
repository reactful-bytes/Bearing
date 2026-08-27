import { Timestamp, getFirestore } from "firebase-admin/firestore";

import {
  RevenueCatV2Config,
  getRevenueCatVirtualCurrencyBalance,
} from "./revenueCatV2";
import {
  CallableIdentityRequest,
  requireAuthenticatedCaller,
} from "./security";

type AiCreditSubscriptionStatus =
  "active" | "in_grace_period" | "expired" | "canceled";

export type AiCreditSubscription = {
  status: AiCreditSubscriptionStatus | null;
  periodStartAt: Date | null;
  periodEndAt: Date | null;
};

export type AiCreditStatus = {
  eligible: boolean;
  availableCredits: number;
};

export type AiCreditSubscriptionLookup = (
  userId: string,
) => Promise<AiCreditSubscription>;

export type AiCreditBalanceLookup = (userId: string) => Promise<number>;

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
  balanceLookup: AiCreditBalanceLookup,
  lookup: AiCreditSubscriptionLookup = loadAiCreditSubscription,
): Promise<AiCreditStatus> {
  const caller = requireAuthenticatedCaller(request);
  const [subscription, availableCredits] = await Promise.all([
    lookup(caller.uid),
    balanceLookup(caller.uid),
  ]);
  const eligible =
    subscription.status === "active" ||
    subscription.status === "in_grace_period";

  return {
    eligible,
    availableCredits,
  };
}

export function createRevenueCatAiCreditBalanceLookup(
  config: RevenueCatV2Config,
): AiCreditBalanceLookup {
  return async (userId) =>
    (await getRevenueCatVirtualCurrencyBalance(userId, config)).balance;
}
