import { createHash } from "node:crypto";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

import {
  createRevenueCatVirtualCurrencyTransaction,
  ensureRevenueCatCustomer,
  RevenueCatV2Config,
} from "./revenueCatV2";

type WelcomeAuthUser = {
  providerData: { providerId: string }[];
};

const WELCOME_AI_CREDIT_AMOUNT = 2;

export type WelcomeAiCreditDependencies = {
  loadUser: (userId: string) => Promise<WelcomeAuthUser>;
  ensureCustomer: (userId: string) => Promise<void>;
  grant: (
    userId: string,
    idempotencyKey: string,
    amount: number,
  ) => Promise<void>;
  markGranted: (userId: string) => Promise<void>;
};

export async function grantWelcomeAiCredit(
  userId: string,
  dependencies: WelcomeAiCreditDependencies,
): Promise<"granted" | "ineligible" | "deleted"> {
  let user: WelcomeAuthUser;
  try {
    user = await dependencies.loadUser(userId);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "auth/user-not-found"
    ) {
      return "deleted";
    }
    throw error;
  }
  if (
    !user.providerData.some(
      ({ providerId }) =>
        providerId === "password" || providerId === "google.com",
    )
  ) {
    return "ineligible";
  }
  const key = createHash("sha256")
    .update(`welcome-ai-credit:v1:${userId}`)
    .digest("hex");
  await dependencies.ensureCustomer(userId);
  await dependencies.grant(userId, key, WELCOME_AI_CREDIT_AMOUNT);
  await dependencies.markGranted(userId);
  return "granted";
}

export async function dismissWelcomeAiCreditMessage(
  userId: string,
): Promise<void> {
  const profileRef = getFirestore().doc(`users/${userId}`);
  const profile = await profileRef.get();
  if (
    profile.get("welcomeAiCreditGranted") !== true ||
    profile.get("welcomeAiCreditMessageDismissed") === true
  ) {
    return;
  }
  await profileRef.update({ welcomeAiCreditMessageDismissed: true });
}

export function createWelcomeAiCreditDependencies(
  config: RevenueCatV2Config,
): WelcomeAiCreditDependencies {
  return {
    loadUser: (userId) => getAuth().getUser(userId),
    ensureCustomer: (userId) => ensureRevenueCatCustomer(userId, config),
    grant: (userId, key, amount) =>
      createRevenueCatVirtualCurrencyTransaction(
        userId,
        "grant",
        key,
        config,
        fetch,
        amount,
      ),
    markGranted: async (userId) => {
      await getFirestore()
        .doc(`users/${userId}`)
        .update({ welcomeAiCreditGranted: true });
    },
  };
}
