import { HttpsError } from "firebase-functions/v2/https";

export type CallableIdentityRequest = {
  auth?: {
    uid: string;
    token?: { auth_time?: number };
  };
};

export type AuthenticatedCaller = {
  uid: string;
};

export function requireAuthenticatedCaller(
  request: CallableIdentityRequest,
): AuthenticatedCaller {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Authentication is required.");
  }

  return {
    uid: request.auth.uid,
  };
}
