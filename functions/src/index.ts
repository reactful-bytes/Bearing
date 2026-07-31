import { initializeApp } from "firebase-admin/app";
import { onCall } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";

import { getBackendStatus } from "./status";

initializeApp();

setGlobalOptions({
  maxInstances: 10,
  region: "us-central1",
});

export const backendStatus = onCall(
  {
    enforceAppCheck: true,
    timeoutSeconds: 15,
  },
  getBackendStatus,
);
