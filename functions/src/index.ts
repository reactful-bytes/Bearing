import { initializeApp } from "firebase-admin/app";
import { defineString } from "firebase-functions/params";
import { logger } from "firebase-functions/logger";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";

import { getBackendStatus } from "./status";
import {
  firestoreGoalPlanMeter,
  generateGoalPlanDraft as generateGoalPlanDraftHandler,
} from "./aiGoalPlan";
import { getAiCreditStatus as getAiCreditStatusHandler } from "./aiCreditStatus";
import { createGeminiGoalPlanGenerator } from "./geminiGoalPlan";
import {
  deleteUserAccount as deleteUserAccountHandler,
  exportUserData as exportUserDataHandler,
} from "./privacy";
import { createUserDataAdminDeleter, readUserDataAdmin } from "./privacyAdmin";
import { recordTelemetryEvent as recordTelemetryEventHandler } from "./telemetry";
import {
  handleRevenueCatWebhook,
  redactRevenueCatWebhookBody,
} from "./revenueCat";

initializeApp();

setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

const geminiApiKey = defineString("GEMINI_API_KEY");
const revenueCatApiKey = defineString("REVENUECAT_SECRET_API_KEY");
const revenueCatWebhookAuthorization = defineString(
  "REVENUECAT_WEBHOOK_AUTHORIZATION",
);
const revenueCatWebhookSigningSecret = defineString(
  "REVENUECAT_WEBHOOK_SIGNING_SECRET",
);
const revenueCatEntitlementIdentifier = defineString(
  "REVENUECAT_ENTITLEMENT_IDENTIFIER",
  { default: "premium" },
);
const revenueCatWebhookDebugLogging = defineString(
  "REVENUECAT_WEBHOOK_DEBUG_LOGGING",
  { default: "false" },
);
const revenueCatTestStorePlatform = defineString(
  "REVENUECAT_TEST_STORE_PLATFORM",
  { default: "web" },
);

export const revenueCatWebhook = onRequest(
  {
    cors: false,
    timeoutSeconds: 30,
  },
  async (request, response) => {
    const result = await handleRevenueCatWebhook(request, response, {
      apiKey: revenueCatApiKey.value(),
      authorization: revenueCatWebhookAuthorization.value(),
      signingSecret: revenueCatWebhookSigningSecret.value(),
      entitlementIdentifier: revenueCatEntitlementIdentifier.value(),
      testStorePlatform: revenueCatTestStorePlatform.value(),
      onVerifiedWebhookEvent:
        revenueCatWebhookDebugLogging.value() === "true"
          ? (body) =>
              logger.info("revenuecat_webhook_event", {
                event: redactRevenueCatWebhookBody(body),
              })
          : undefined,
    });
    if (!result) return;

    const logContext = {
      premiumEntitlementPresent: result.premiumEntitlementPresent,
      status: result.status,
    };
    if (result.status === "active" || result.status === "in_grace_period") {
      logger.info("revenuecat_subscription_reconciled", logContext);
      return;
    }
    logger.warn("revenuecat_subscription_not_active", logContext);
  },
);

export const backendStatus = onCall(
  {
    timeoutSeconds: 15,
  },
  getBackendStatus,
);

export const recordTelemetryEvent = onCall(
  {
    timeoutSeconds: 10,
  },
  (request) =>
    recordTelemetryEventHandler(request, (event) => {
      logger.info("telemetry_event", event);
    }),
);

export const getAiCreditStatus = onCall(
  {
    timeoutSeconds: 15,
  },
  (request) => getAiCreditStatusHandler(request),
);

export const generateGoalPlanDraft = onCall(
  {
    timeoutSeconds: 45,
  },
  (request) =>
    generateGoalPlanDraftHandler(
      request,
      createGeminiGoalPlanGenerator(geminiApiKey.value()),
      undefined,
      firestoreGoalPlanMeter,
    ),
);

export const exportUserData = onCall(
  {
    timeoutSeconds: 60,
  },
  (request) => exportUserDataHandler(request, readUserDataAdmin),
);

export const deleteUserAccount = onCall(
  {
    timeoutSeconds: 120,
  },
  async (request) => {
    try {
      const result = await deleteUserAccountHandler(
        request,
        createUserDataAdminDeleter(revenueCatApiKey.value()),
      );
      logger.info("account_deletion_result", { outcome: "success" });
      return result;
    } catch (error) {
      logger.error("account_deletion_result", { outcome: "failure" });
      throw error;
    }
  },
);
