import { httpsCallable } from 'firebase/functions';

import { getFirebaseFunctions } from './firebaseFunctions';

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

export async function exportCurrentUserData(): Promise<UserDataExport> {
  const exportData = httpsCallable<Record<string, never>, UserDataExport>(
    getFirebaseFunctions(),
    'exportUserData',
    { timeout: 65_000 },
  );
  const result = await exportData({});
  return result.data;
}

export async function deleteCurrentUserAccount(): Promise<void> {
  const deleteAccount = httpsCallable<Record<string, never>, { deleted: true }>(
    getFirebaseFunctions(),
    'deleteUserAccount',
    { timeout: 125_000 },
  );
  await deleteAccount({});
}
