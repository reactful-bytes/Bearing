import { HttpsError } from "firebase-functions/v2/https";

export type CallableIdentityRequest = {
  app?: { appId: string };
  auth?: {
    uid: string;
    token?: { auth_time?: number };
  };
};

export type VerifiedCaller = {
  appId: string;
  uid: string;
};

export function requireVerifiedCaller(
  request: CallableIdentityRequest,
): VerifiedCaller {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  if (!request.app) {
    throw new HttpsError(
      "failed-precondition",
      "App Check verification is required.",
    );
  }

  return {
    appId: request.app.appId,
    uid: request.auth.uid,
  };
}
