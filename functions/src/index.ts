import { initializeApp } from "firebase-admin/app";
import { defineString } from "firebase-functions/params";
import { logger } from "firebase-functions/logger";
import { onCall, onRequest } from "firebase-functions/v2/https";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { setGlobalOptions } from "firebase-functions/v2/options";

import { getBackendStatus } from "./status";
import {
  createRevenueCatGoalPlanCreditService,
  createGoalPlanGeneratorRegistry,
  GOAL_PLAN_PROVIDERS,
  generateGoalPlanDraft as generateGoalPlanDraftHandler,
} from "./aiGoalPlan";
import {
  createRevenueCatAiCreditBalanceLookup,
  loadAiCreditWelcomeGrant,
  getAiCreditStatus as getAiCreditStatusHandler,
} from "./aiCreditStatus";
import { createGeminiGoalPlanGenerator } from "./geminiGoalPlan";
import { createOpenAiGoalPlanGenerator } from "./openAiGoalPlan";
import { createGoalPlanDraftAdminPersister } from "./goalDraftAdmin";
import {
  deleteUserAccount as deleteUserAccountHandler,
  exportUserData as exportUserDataHandler,
} from "./privacy";
import {
  createUserDataAdminDeleter,
  createUserDataAdminReader,
} from "./privacyAdmin";
import { recordTelemetryEvent as recordTelemetryEventHandler } from "./telemetry";
import {
  handleRevenueCatWebhook,
  redactRevenueCatWebhookBody,
} from "./revenueCat";
import {
  createRevenueCatProductGrantCatalog,
  getRevenueCatProductGrantCatalog as getRevenueCatProductGrantCatalogHandler,
} from "./revenueCatCatalog";
import { RevenueCatV2Config } from "./revenueCatV2";
import {
  createWelcomeAiCreditDependencies,
  grantWelcomeAiCredit,
} from "./welcomeAiCredit";

initializeApp();

setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

const geminiApiKey = defineString("GEMINI_API_KEY");
const openAiApiKey = defineString("OPENAI_API_KEY");
const revenueCatApiKey = defineString("REVENUECAT_SECRET_API_KEY");
const revenueCatV2ApiKey = defineString("REVENUECAT_SECRET_API_KEY_V2");
const revenueCatProjectId = defineString("REVENUECAT_PROJECT_ID");
const revenueCatVirtualCurrencyCode = defineString(
  "REVENUECAT_AI_CURRENCY_CODE",
  { default: "AIC" },
);
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

function revenueCatV2Config(): RevenueCatV2Config {
  return {
    apiKey: revenueCatV2ApiKey.value(),
    projectId: revenueCatProjectId.value(),
    currencyCode: revenueCatVirtualCurrencyCode.value(),
  };
}

let loadRevenueCatProductGrantCatalog:
  | (() => Promise<import("./revenueCatCatalog").RevenueCatProductGrant[]>)
  | null = null;

export const welcomeAiCredit = onDocumentCreated(
  { document: "users/{userId}", retry: true, timeoutSeconds: 60 },
  async (event) => {
    try {
      await grantWelcomeAiCredit(
        event.params.userId,
        createWelcomeAiCreditDependencies(revenueCatV2Config()),
      );
    } catch {
      logger.error("welcome_ai_credit_failed");
      throw new Error("Welcome AI credit grant failed.");
    }
  },
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
  (request) =>
    getAiCreditStatusHandler(
      request,
      createRevenueCatAiCreditBalanceLookup(revenueCatV2Config()),
      loadAiCreditWelcomeGrant,
    ),
);

export const getRevenueCatProductGrantCatalog = onCall(
  {
    timeoutSeconds: 15,
  },
  (request) => {
    loadRevenueCatProductGrantCatalog ??=
      createRevenueCatProductGrantCatalog(revenueCatV2Config());
    return getRevenueCatProductGrantCatalogHandler(
      request,
      loadRevenueCatProductGrantCatalog,
    );
  },
);

export const generateGoalPlanDraft = onCall(
  {
    timeoutSeconds: 120,
  },
  (request) => {
    const generator = createGoalPlanGeneratorRegistry({
      [GOAL_PLAN_PROVIDERS.OPENAI]: createOpenAiGoalPlanGenerator(
        openAiApiKey.value(),
      ),
      [GOAL_PLAN_PROVIDERS.GEMINI]: createGeminiGoalPlanGenerator(
        geminiApiKey.value(),
      ),
    });
    return generateGoalPlanDraftHandler(
      request,
      generator,
      createRevenueCatGoalPlanCreditService(
        revenueCatV2Config(),
        createGoalPlanDraftAdminPersister(),
      ),
      new Date(),
    );
  },
);

export const exportUserData = onCall(
  {
    timeoutSeconds: 60,
  },
  (request) =>
    exportUserDataHandler(
      request,
      createUserDataAdminReader(revenueCatV2Config()),
    ),
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
