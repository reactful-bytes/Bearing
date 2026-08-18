import { renderHook, waitFor } from '@testing-library/react-native';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { onAuthStateChanged, reload } from 'firebase/auth';

import { useGoogleAuth } from '../auth/useGoogleAuth';
import { getFirebaseAuth } from '../../services/firebase/firebaseAuth';
import { ensureUserProfile, subscribeToUserProfile } from '../../services/firebase/firebaseUsers';
import { useUserProfile } from './useUserProfile';

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
  reload: jest.fn(),
}));

jest.mock('../auth/useGoogleAuth', () => ({
  useGoogleAuth: jest.fn(),
}));

jest.mock('../auth/googleNativeAuth', () => ({
  revokeNativeGoogleAccess: jest.fn(),
}));

jest.mock('../../services/firebase/firebaseAuth', () => ({
  getFirebaseAuth: jest.fn(),
}));

jest.mock('../../services/firebase/firebaseAuthActions', () => ({
  linkAnonymousUserWithEmailPassword: jest.fn(),
  linkAnonymousUserWithGoogleAuth: jest.fn(),
  linkCurrentUserWithGoogleAuth: jest.fn(),
  reauthenticateCurrentUserWithGoogleAuth: jest.fn(),
  sendPasswordResetForEmail: jest.fn(),
  updateCurrentUserDisplayName: jest.fn(),
}));

jest.mock('../../services/firebase/firebaseUsers', () => ({
  ensureUserProfile: jest.fn(async () => undefined),
  subscribeToUserProfile: jest.fn(() => jest.fn()),
  updateUserProfile: jest.fn(),
}));

describe('useUserProfile provider metadata', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useGoogleAuth as jest.MockedFunction<typeof useGoogleAuth>).mockReturnValue({
      isConfigured: true,
      isReady: true,
      acquireTokens: jest.fn(async () => ({ type: 'cancelled' as const })),
    });
  });

  it('reloads stale provider data before reporting connected providers', async () => {
    const user = {
      uid: 'user-1',
      email: 'person@example.com',
      isAnonymous: false,
      providerData: [{ providerId: 'password' }],
    };
    const auth = { currentUser: user };
    (getFirebaseAuth as jest.MockedFunction<typeof getFirebaseAuth>).mockReturnValue(auth as never);
    (onAuthStateChanged as jest.MockedFunction<typeof onAuthStateChanged>).mockImplementation(
      (_auth, onNext) => {
        if (typeof onNext === 'function') {
          onNext(user as never);
        } else {
          onNext.next(user as never);
        }
        return jest.fn();
      },
    );
    (reload as jest.MockedFunction<typeof reload>).mockImplementation(async () => {
      user.providerData = [{ providerId: 'password' }, { providerId: 'google.com' }];
    });

    const { result } = renderHook(() => useUserProfile());

    expect(result.current.hasPasswordProvider).toBe(true);
    expect(result.current.hasGoogleProvider).toBe(false);

    await waitFor(() => expect(result.current.hasGoogleProvider).toBe(true));
    expect(reload).toHaveBeenCalledWith(user);
    expect(ensureUserProfile).toHaveBeenCalledWith(user);
    expect(subscribeToUserProfile).toHaveBeenCalledWith(
      'user-1',
      expect.any(Function),
      expect.any(Function),
    );
  });
});
