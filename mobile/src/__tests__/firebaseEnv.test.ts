import { afterAll, beforeEach, describe, expect, it } from '@jest/globals';

import { getFirebaseRuntimeConfig } from '../services/config/firebaseEnv';

const firebaseEnvKeys = [
  'EXPO_PUBLIC_FIREBASE_API_KEY',
  'EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN',
  'EXPO_PUBLIC_FIREBASE_PROJECT_ID',
  'EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET',
  'EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
  'EXPO_PUBLIC_FIREBASE_APP_ID',
] as const;

const originalEnv = Object.fromEntries(
  firebaseEnvKeys.map((key) => [key, process.env[key]]),
) as Record<(typeof firebaseEnvKeys)[number], string | undefined>;

function setCompleteFirebaseEnv(): void {
  process.env.EXPO_PUBLIC_FIREBASE_API_KEY = 'test-api-key';
  process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN = 'test-project.firebaseapp.com';
  process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID = 'test-project';
  process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET = 'test-project.firebasestorage.app';
  process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '123456789';
  process.env.EXPO_PUBLIC_FIREBASE_APP_ID = '1:123456789:web:abcdef';
}

describe('Firebase runtime config', () => {
  beforeEach(setCompleteFirebaseEnv);

  afterAll(() => {
    for (const key of firebaseEnvKeys) {
      const value = originalEnv[key];

      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  });

  it('reads all Firebase values from Expo public environment variables', () => {
    expect(getFirebaseRuntimeConfig()).toEqual({
      apiKey: 'test-api-key',
      authDomain: 'test-project.firebaseapp.com',
      projectId: 'test-project',
      storageBucket: 'test-project.firebasestorage.app',
      messagingSenderId: '123456789',
      appId: '1:123456789:web:abcdef',
    });
  });

  it('identifies each missing environment value', () => {
    delete process.env.EXPO_PUBLIC_FIREBASE_API_KEY;
    process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID = '   ';

    expect(() => getFirebaseRuntimeConfig()).toThrow(
      'Missing environment values: EXPO_PUBLIC_FIREBASE_API_KEY, EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID',
    );
  });
});