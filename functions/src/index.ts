import { initializeApp } from "firebase-admin/app";
import { defineSecret } from "firebase-functions/params";
import { onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";

import { getBackendStatus } from "./status";
import { generateGoalPlanDraft as generateGoalPlanDraftHandler } from "./aiGoalPlan";
import { createGeminiGoalPlanGenerator } from "./geminiGoalPlan";
import {
  deleteUserAccount as deleteUserAccountHandler,
  exportUserData as exportUserDataHandler,
} from "./privacy";
import { deleteUserDataAdmin, readUserDataAdmin } from "./privacyAdmin";

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
    timeoutSeconds: 120,
  },
  (request) => deleteUserAccountHandler(request, deleteUserDataAdmin),
);
