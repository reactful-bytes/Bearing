import { FirebaseApp, getApp, getApps, initializeApp } from 'firebase/app';

import { getFirebaseRuntimeConfig } from '../config/firebaseEnv';

let cachedFirebaseApp: FirebaseApp | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (cachedFirebaseApp) {
    return cachedFirebaseApp;
  }

  try {
    const config = getFirebaseRuntimeConfig();
    cachedFirebaseApp = getApps().length > 0 ? getApp() : initializeApp(config);
    return cachedFirebaseApp;
  } catch (error) {
    const reason = error instanceof Error ? ` ${error.message}` : '';

    throw new Error(`Failed to initialize Firebase app.${reason}`, {
      cause: error,
    });
  }
}
