import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FirebaseAuth from 'firebase/auth';

import { getFirebaseApp } from './firebaseApp';
import { getFirebaseAuth } from './firebaseAuth.native';

const getReactNativePersistence = (
  FirebaseAuth as typeof FirebaseAuth & {
    getReactNativePersistence: jest.Mock;
  }
).getReactNativePersistence;

jest.mock('firebase/auth', () => ({
  getReactNativePersistence: jest.fn(() => 'native-persistence'),
  initializeAuth: jest.fn(),
}));

jest.mock('./firebaseApp', () => ({ getFirebaseApp: jest.fn() }));

describe('Firebase auth initialization', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses AsyncStorage persistence on React Native', () => {
    const firebaseApp = { name: 'test-app' };
    const auth = { currentUser: null };
    (getFirebaseApp as jest.MockedFunction<typeof getFirebaseApp>).mockReturnValue(
      firebaseApp as never,
    );
    (
      FirebaseAuth.initializeAuth as jest.MockedFunction<typeof FirebaseAuth.initializeAuth>
    ).mockReturnValue(auth as never);

    expect(getFirebaseAuth()).toBe(auth);
    expect(getReactNativePersistence).toHaveBeenCalledWith(AsyncStorage);
    expect(FirebaseAuth.initializeAuth).toHaveBeenCalledWith(firebaseApp, {
      persistence: 'native-persistence',
    });
  });
});
