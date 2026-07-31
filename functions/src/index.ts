import { initializeApp } from "firebase-admin/app";
import { defineSecret } from "firebase-functions/params";
import { onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";

import { getBackendStatus } from "./status";
import { generateGoalPlanDraft as generateGoalPlanDraftHandler } from "./aiGoalPlan";
import { createGeminiGoalPlanGenerator } from "./geminiGoalPlan";

initializeApp();

setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

const geminiApiKey = defineSecret("GEMINI_API_KEY");

export const backendStatus = onCall(
  {
    enforceAppCheck: true,
    timeoutSeconds: 15,
  },
  getBackendStatus,
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
