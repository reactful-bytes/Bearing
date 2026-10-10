import { getFirestore } from "firebase-admin/firestore";

import {
  RevenueCatV2Config,
  getRevenueCatVirtualCurrencyBalance,
} from "./revenueCatV2";
import {
  CallableIdentityRequest,
  requireAuthenticatedCaller,
} from "./security";

export type AiCreditStatus = {
  eligible: boolean;
  availableCredits: number;
  welcomeMessageEligible: boolean;
};

export type AiCreditBalanceLookup = (userId: string) => Promise<number>;
export type AiCreditWelcomeGrantState = {
  granted: boolean;
  messageDismissed: boolean;
};
export type AiCreditWelcomeGrantLookup = (
  userId: string,
) => Promise<AiCreditWelcomeGrantState>;

export async function loadAiCreditWelcomeGrant(
  userId: string,
): Promise<AiCreditWelcomeGrantState> {
  const db = getFirestore();
  const [profile, subscription] = await Promise.all([
    db.doc(`users/${userId}`).get(),
    db.doc(`subscriptions/${userId}`).get(),
  ]);
  const subscriptionProductId = subscription.get("productId");
  return {
    granted: profile.get("welcomeAiCreditGranted") === true,
    messageDismissed:
      profile.get("welcomeAiCreditMessageDismissed") === true ||
      subscription.get("hasEverSubscribed") === true ||
      (typeof subscriptionProductId === "string" &&
        subscriptionProductId.length > 0),
  };
}

export async function getAiCreditStatus(
  request: CallableIdentityRequest,
  balanceLookup: AiCreditBalanceLookup,
  welcomeGrantLookup: AiCreditWelcomeGrantLookup = async () => ({
    granted: false,
    messageDismissed: false,
  }),
): Promise<AiCreditStatus> {
  const caller = requireAuthenticatedCaller(request);
  const [availableCredits, welcomeGrantState] = await Promise.all([
    balanceLookup(caller.uid),
    welcomeGrantLookup(caller.uid).catch(() => ({
      granted: false,
      messageDismissed: false,
    })),
  ]);

  return {
    eligible: availableCredits > 0,
    availableCredits,
    welcomeMessageEligible:
      welcomeGrantState.granted &&
      !welcomeGrantState.messageDismissed &&
      availableCredits > 0,
  };
}

export function createRevenueCatAiCreditBalanceLookup(
  config: RevenueCatV2Config,
): AiCreditBalanceLookup {
  return async (userId) =>
    (await getRevenueCatVirtualCurrencyBalance(userId, config)).balance;
}
