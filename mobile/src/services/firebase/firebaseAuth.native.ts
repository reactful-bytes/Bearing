import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FirebaseAuth from 'firebase/auth';
import { Auth, Persistence } from 'firebase/auth';

import { getFirebaseApp } from './firebaseApp';

type ReactNativeFirebaseAuth = typeof FirebaseAuth & {
  getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
};

let cachedAuth: Auth | null = null;

export function getFirebaseAuth(): Auth {
  if (cachedAuth) {
    return cachedAuth;
  }

  const firebaseApp = getFirebaseApp();

  try {
    // Firebase's wrapper typings omit this React Native conditional export.
    const { getReactNativePersistence } = FirebaseAuth as ReactNativeFirebaseAuth;
    cachedAuth = FirebaseAuth.initializeAuth(firebaseApp, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
    return cachedAuth;
  } catch (error) {
    throw new Error('Failed to initialize Firebase auth.', {
      cause: error,
    });
  }
}
