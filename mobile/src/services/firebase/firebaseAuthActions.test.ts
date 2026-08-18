import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
  GoogleAuthProvider,
  linkWithCredential,
  reauthenticateWithCredential,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  unlink,
} from 'firebase/auth';

import { clearNativeGoogleSession } from '../../features/auth/googleNativeAuth';
import {
  completeGooglePasswordConflict,
  GoogleCredentialCollisionError,
  linkAnonymousUserWithGoogleAuth,
  reauthenticateCurrentUserWithGoogleAuth,
  signInWithGoogleAuth,
  signOutCurrentUser,
  unlinkGoogleFromCurrentUser,
} from './firebaseAuthActions';
import { getFirebaseAuth } from './firebaseAuth';

jest.mock('firebase/auth', () => ({
  EmailAuthProvider: { credential: jest.fn(() => ({ providerId: 'password' })) },
  GoogleAuthProvider: { credential: jest.fn(() => ({ providerId: 'google.com' })) },
  createUserWithEmailAndPassword: jest.fn(),
  linkWithCredential: jest.fn(),
  reauthenticateWithCredential: jest.fn(),
  sendPasswordResetEmail: jest.fn(),
  signInAnonymously: jest.fn(),
  signInWithCredential: jest.fn(),
  signInWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  unlink: jest.fn(),
  updateProfile: jest.fn(),
}));

jest.mock('./firebaseAuth', () => ({ getFirebaseAuth: jest.fn() }));

jest.mock('../../features/auth/googleNativeAuth', () => ({
  clearNativeGoogleSession: jest.fn(),
}));

const tokens = { type: 'success' as const, idToken: 'id-token', accessToken: 'access-token' };
const googleCredential = { providerId: 'google.com' };
const mockedLinkWithCredential = linkWithCredential as jest.MockedFunction<
  typeof linkWithCredential
>;
const mockedReauthenticateWithCredential = reauthenticateWithCredential as jest.MockedFunction<
  typeof reauthenticateWithCredential
>;
const mockedSignInWithCredential = signInWithCredential as jest.MockedFunction<
  typeof signInWithCredential
>;
const mockedSignInWithEmailAndPassword = signInWithEmailAndPassword as jest.MockedFunction<
  typeof signInWithEmailAndPassword
>;
const mockedSignOut = signOut as jest.MockedFunction<typeof signOut>;
const mockedUnlink = unlink as jest.MockedFunction<typeof unlink>;
const mockedClearNativeGoogleSession = clearNativeGoogleSession as jest.MockedFunction<
  typeof clearNativeGoogleSession
>;

function createUser(overrides: Record<string, unknown> = {}) {
  return {
    uid: 'user-1',
    isAnonymous: false,
    providerData: [{ providerId: 'password' }],
    ...overrides,
  };
}

describe('Firebase Google auth actions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (GoogleAuthProvider.credential as jest.Mock).mockReturnValue(googleCredential);
    (getFirebaseAuth as jest.Mock).mockReturnValue({ currentUser: null });
  });

  it('signs in with a Google credential', async () => {
    const user = createUser({ providerData: [{ providerId: 'google.com' }] });
    mockedSignInWithCredential.mockResolvedValue({ user } as never);

    await expect(signInWithGoogleAuth(tokens)).resolves.toEqual({ type: 'success', user });
    expect(GoogleAuthProvider.credential).toHaveBeenCalledWith('id-token', 'access-token');
  });

  it('returns an in-memory password conflict without switching accounts', async () => {
    mockedSignInWithCredential.mockRejectedValue({
      code: 'auth/account-exists-with-different-credential',
      customData: { email: 'person@example.com' },
    });

    await expect(signInWithGoogleAuth(tokens)).resolves.toEqual({
      type: 'password-conflict',
      email: 'person@example.com',
      credential: googleCredential,
    });
    expect(linkWithCredential).not.toHaveBeenCalled();
  });

  it('verifies the password account before linking the pending credential', async () => {
    const user = createUser();
    mockedSignInWithEmailAndPassword.mockResolvedValue({ user } as never);
    mockedLinkWithCredential.mockResolvedValue({ user } as never);

    await expect(
      completeGooglePasswordConflict(' person@example.com ', 'password', googleCredential as never),
    ).resolves.toBe(user);
    expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
      expect.anything(),
      'person@example.com',
      'password',
    );
    expect(linkWithCredential).toHaveBeenCalledWith(user, googleCredential);
  });

  it('keeps an anonymous UID while linking Google', async () => {
    const user = createUser({ isAnonymous: true, providerData: [] });
    (getFirebaseAuth as jest.Mock).mockReturnValue({ currentUser: user });
    mockedLinkWithCredential.mockResolvedValue({
      user: { ...user, isAnonymous: false, providerData: [{ providerId: 'google.com' }] },
    } as never);

    await expect(linkAnonymousUserWithGoogleAuth(tokens, 'user-1')).resolves.toMatchObject({
      uid: 'user-1',
    });
  });

  it('does not fall back to sign-in when a Google credential is already owned', async () => {
    const user = createUser({ isAnonymous: true, providerData: [] });
    (getFirebaseAuth as jest.Mock).mockReturnValue({ currentUser: user });
    mockedLinkWithCredential.mockRejectedValue({
      code: 'auth/credential-already-in-use',
    });

    await expect(linkAnonymousUserWithGoogleAuth(tokens, 'user-1')).rejects.toBeInstanceOf(
      GoogleCredentialCollisionError,
    );
    expect(signInWithCredential).not.toHaveBeenCalled();
  });

  it('reauthenticates the expected current Google user', async () => {
    const user = createUser({ providerData: [{ providerId: 'google.com' }] });
    (getFirebaseAuth as jest.Mock).mockReturnValue({ currentUser: user });
    mockedReauthenticateWithCredential.mockResolvedValue({ user } as never);

    await reauthenticateCurrentUserWithGoogleAuth(tokens, 'user-1');
    expect(reauthenticateWithCredential).toHaveBeenCalledWith(user, googleCredential);
  });

  it('disconnects Google while preserving the password account UID', async () => {
    const user = createUser({
      providerData: [{ providerId: 'password' }, { providerId: 'google.com' }],
    });
    const unlinkedUser = createUser();
    (getFirebaseAuth as jest.Mock).mockReturnValue({ currentUser: user });
    mockedUnlink.mockResolvedValue(unlinkedUser as never);

    await expect(unlinkGoogleFromCurrentUser('user-1')).resolves.toBe(unlinkedUser);
    expect(unlink).toHaveBeenCalledWith(user, 'google.com');
  });

  it('does not disconnect Google when it is the only sign-in provider', async () => {
    const user = createUser({ providerData: [{ providerId: 'google.com' }] });
    (getFirebaseAuth as jest.Mock).mockReturnValue({ currentUser: user });

    await expect(unlinkGoogleFromCurrentUser('user-1')).rejects.toThrow(
      'Failed to disconnect Google Sign-In.',
    );
    expect(unlink).not.toHaveBeenCalled();
  });

  it('signs Firebase out before best-effort native cleanup', async () => {
    const user = createUser({ providerData: [{ providerId: 'google.com' }] });
    (getFirebaseAuth as jest.Mock).mockReturnValue({ currentUser: user });
    mockedSignOut.mockResolvedValue(undefined);
    mockedClearNativeGoogleSession.mockRejectedValue(new Error('native cleanup failed'));

    await expect(signOutCurrentUser()).resolves.toBeUndefined();
    expect(signOut).toHaveBeenCalled();
    expect(clearNativeGoogleSession).toHaveBeenCalled();
  });
});
