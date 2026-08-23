import { HttpsError } from "firebase-functions/v2/https";

import {
  CallableIdentityRequest,
  requireAuthenticatedCaller,
} from "./security";

const MAX_AUTH_AGE_SECONDS = 5 * 60;

export type UserDataExport = {
  exportedAt: string;
  userId: string;
  profile: unknown;
  subscription: unknown;
  events: unknown[];
  goals: unknown[];
  goalSteps: unknown[];
  notes: unknown[];
  tasks: unknown[];
};

export type UserDataReader = (
  userId: string,
) => Promise<Omit<UserDataExport, "exportedAt">>;
export type UserDataDeleter = (userId: string) => Promise<void>;

export async function exportUserData(
  request: CallableIdentityRequest,
  readUserData: UserDataReader,
  now: Date = new Date(),
): Promise<UserDataExport> {
  const caller = requireAuthenticatedCaller(request);
  const data = await readUserData(caller.uid);

  return {
    ...data,
    userId: caller.uid,
    exportedAt: now.toISOString(),
  };
}

export async function deleteUserAccount(
  request: CallableIdentityRequest,
  deleteUserData: UserDataDeleter,
  now: Date = new Date(),
): Promise<{ deleted: true }> {
  const caller = requireAuthenticatedCaller(request);
  const authTime = request.auth?.token?.auth_time;
  const nowSeconds = Math.floor(now.getTime() / 1_000);

  if (
    !authTime ||
    nowSeconds - authTime > MAX_AUTH_AGE_SECONDS ||
    authTime > nowSeconds + 60
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Sign in again before deleting this account.",
    );
  }

  await deleteUserData(caller.uid);
  return { deleted: true };
}
