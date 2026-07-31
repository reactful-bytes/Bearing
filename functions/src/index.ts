import { initializeApp } from "firebase-admin/app";
import { defineSecret } from "firebase-functions/params";
import { logger } from "firebase-functions/logger";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";

import { getBackendStatus } from "./status";
import { generateGoalPlanDraft as generateGoalPlanDraftHandler } from "./aiGoalPlan";
import { createGeminiGoalPlanGenerator } from "./geminiGoalPlan";
import {
  deleteUserAccount as deleteUserAccountHandler,
  exportUserData as exportUserDataHandler,
} from "./privacy";
import { createUserDataAdminDeleter, readUserDataAdmin } from "./privacyAdmin";
import { recordTelemetryEvent as recordTelemetryEventHandler } from "./telemetry";
import { handleRevenueCatWebhook } from "./revenueCat";

initializeApp();

setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

const geminiApiKey = defineSecret("GEMINI_API_KEY");
const revenueCatApiKey = defineSecret("REVENUECAT_SECRET_API_KEY");
const revenueCatWebhookAuthorization = defineSecret(
  "REVENUECAT_WEBHOOK_AUTHORIZATION",
);
const revenueCatWebhookSigningSecret = defineSecret(
  "REVENUECAT_WEBHOOK_SIGNING_SECRET",
);

export const revenueCatWebhook = onRequest(
  {
    cors: false,
    secrets: [
      revenueCatApiKey,
      revenueCatWebhookAuthorization,
      revenueCatWebhookSigningSecret,
    ],
    timeoutSeconds: 30,
  },
  (request, response) =>
    handleRevenueCatWebhook(request, response, {
      apiKey: revenueCatApiKey.value(),
      authorization: revenueCatWebhookAuthorization.value(),
      signingSecret: revenueCatWebhookSigningSecret.value(),
    }),
);

export const backendStatus = onCall(
  {
    enforceAppCheck: true,
    timeoutSeconds: 15,
  },
  getBackendStatus,
);

export const recordTelemetryEvent = onCall(
  {
    enforceAppCheck: true,
    timeoutSeconds: 10,
  },
  (request) =>
    recordTelemetryEventHandler(request, (event) => {
      logger.info("telemetry_event", event);
    }),
);

export const generateGoalPlanDraft = onCall(
  {
    enforceAppCheck: true,
    secrets: [geminiApiKey],
    timeoutSeconds: 45,
  },
  (request) =>
    generateGoalPlanDraftHandler(
      request,
      createGeminiGoalPlanGenerator(geminiApiKey.value()),
    ),
);

export const exportUserData = onCall(
  {
    enforceAppCheck: true,
    timeoutSeconds: 60,
  },
  (request) => exportUserDataHandler(request, readUserDataAdmin),
);

export const deleteUserAccount = onCall(
  {
    enforceAppCheck: true,
    secrets: [revenueCatApiKey],
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
