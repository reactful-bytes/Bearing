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

export function getWelcomeAiCreditErrorLogContext(
  error: unknown,
): Record<string, string | number> {
  const context: Record<string, string | number> = {
    errorType:
      error instanceof Error && /^[a-zA-Z0-9_.-]{1,64}$/.test(error.name)
        ? error.name
        : "unknown",
  };
  if (!error || typeof error !== "object") return context;

  const details = error as { code?: unknown; status?: unknown };
  if (
    typeof details.code === "string" &&
    /^[a-zA-Z0-9_/-]{1,64}$/.test(details.code)
  ) {
    context.errorCode = details.code;
  } else if (
    typeof details.code === "number" &&
    Number.isInteger(details.code)
  ) {
    context.errorCode = details.code;
  }
  if (
    typeof details.status === "number" &&
    Number.isInteger(details.status) &&
    details.status >= 100 &&
    details.status <= 599
  ) {
    context.httpStatus = details.status;
  }

  if (error instanceof Error) {
    const revenueCatFailure =
      /^RevenueCat (customer creation|virtual currency transaction) failed: ([1-5][0-9]{2})$/.exec(
        error.message,
      );
    if (revenueCatFailure) {
      context.operation =
        revenueCatFailure[1] === "customer creation"
          ? "revenuecat_customer_creation"
          : "revenuecat_credit_transaction";
      context.httpStatus = Number(revenueCatFailure[2]);
    }
  }

  return context;
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
