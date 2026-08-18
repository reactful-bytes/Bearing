import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, reload, User } from 'firebase/auth';

import { revokeNativeGoogleAccess } from '../auth/googleNativeAuth';
import { useGoogleAuth } from '../auth/useGoogleAuth';
import {
  linkAnonymousUserWithGoogleAuth,
  linkAnonymousUserWithEmailPassword,
  linkCurrentUserWithGoogleAuth,
  reauthenticateCurrentUserWithGoogleAuth,
  sendPasswordResetForEmail,
  unlinkGoogleFromCurrentUser,
  updateCurrentUserDisplayName,
} from '../../services/firebase/firebaseAuthActions';
import { getFirebaseAuth } from '../../services/firebase/firebaseAuth';
import {
  ensureUserProfile,
  subscribeToUserProfile,
  updateUserProfile as updateFirebaseUserProfile,
} from '../../services/firebase/firebaseUsers';
import { UpdateUserProfileInput, UserProfileRecord, UserProfileUiState } from './profileTypes';

export type UseUserProfileReturn = {
  authUser: User | null;
  profile: UserProfileRecord | null;
  uiState: UserProfileUiState;
  error: Error | null;
  isAnonymous: boolean;
  email: string | null;
  hasPasswordProvider: boolean;
  hasGoogleProvider: boolean;
  isGoogleAuthReady: boolean;
  updateProfile: (fields: UpdateUserProfileInput) => Promise<void>;
  sendPasswordReset: () => Promise<void>;
  linkAnonymousAccount: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
  linkGoogleAccount: () => Promise<'linked' | 'cancelled'>;
  disconnectGoogleAccount: () => Promise<void>;
  reauthenticateWithGoogle: () => Promise<'verified' | 'cancelled'>;
  revokeGoogleAccess: () => Promise<void>;
  retry: () => void;
};

type AuthUserSnapshot = {
  user: User | null;
  providerIds: string[];
};

function createAuthUserSnapshot(user: User | null): AuthUserSnapshot {
  return {
    user,
    providerIds: user?.providerData.map((provider) => provider.providerId) ?? [],
  };
}

export function useUserProfile(): UseUserProfileReturn {
  const googleAuth = useGoogleAuth();
  const [authSnapshot, setAuthSnapshot] = useState<AuthUserSnapshot>(() =>
    createAuthUserSnapshot(getFirebaseAuth().currentUser),
  );
  const authUser = authSnapshot.user;
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [uiState, setUiState] = useState<UserProfileUiState>('loading');
  const [error, setError] = useState<Error | null>(null);
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const auth = getFirebaseAuth();
    let cancelled = false;
    let authChangeId = 0;

    const unsubscribe = onAuthStateChanged(
      auth,
      (nextUser) => {
        const currentAuthChangeId = ++authChangeId;

        void (async () => {
          if (nextUser) {
            try {
              await reload(nextUser);
            } catch {
              // Keep the authenticated session usable when metadata refresh is temporarily offline.
            }
          }

          if (cancelled || currentAuthChangeId !== authChangeId) {
            return;
          }

          setAuthSnapshot(createAuthUserSnapshot(nextUser));
        })();
      },
      (authError) => {
        setUiState('error');
        setError(authError);
      },
    );

    return () => {
      cancelled = true;
      authChangeId += 1;
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!authUser) {
      setProfile(null);
      setUiState('error');
      setError(new Error('User is not authenticated.'));
      return;
    }

    let cancelled = false;
    setUiState('loading');
    setError(null);

    void ensureUserProfile(authUser).catch((profileError) => {
      if (cancelled) {
        return;
      }

      setUiState('error');
      setError(
        profileError instanceof Error ? profileError : new Error('Failed to ensure user profile.'),
      );
    });

    const unsubscribe = subscribeToUserProfile(
      authUser.uid,
      (nextProfile) => {
        if (cancelled) {
          return;
        }

        if (!nextProfile) {
          return;
        }

        setProfile(nextProfile);
        setUiState('ready');
        setError(null);
      },
      (subscriptionError) => {
        if (cancelled) {
          return;
        }

        setUiState('error');
        setError(subscriptionError);
      },
    );

    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, [authUser, revision]);

  const retry = useCallback(() => {
    setUiState('loading');
    setError(null);
    setRevision((current) => current + 1);
  }, []);

  const updateProfile = useCallback(
    async (fields: UpdateUserProfileInput): Promise<void> => {
      if (!authUser) {
        throw new Error('User is not authenticated.');
      }

      const trimmedDisplayName = fields.displayName?.trim();

      if (trimmedDisplayName !== undefined && trimmedDisplayName !== (authUser.displayName ?? '')) {
        await updateCurrentUserDisplayName(trimmedDisplayName);
      }

      await updateFirebaseUserProfile(authUser.uid, fields);
    },
    [authUser],
  );

  const sendPasswordReset = useCallback(async (): Promise<void> => {
    const email = authUser?.email?.trim();

    if (!email) {
      throw new Error('No email address is available for password reset.');
    }

    await sendPasswordResetForEmail(email);
  }, [authUser]);

  const linkAnonymousAccount = useCallback(
    async (input: { email: string; password: string; displayName: string }): Promise<void> => {
      if (!authUser) {
        throw new Error('User is not authenticated.');
      }

      const linkedUser = await linkAnonymousUserWithEmailPassword(
        input.email,
        input.password,
        input.displayName,
      );

      await ensureUserProfile(linkedUser);
      setAuthSnapshot(createAuthUserSnapshot(linkedUser));
    },
    [authUser],
  );

  const linkGoogleAccount = useCallback(async (): Promise<'linked' | 'cancelled'> => {
    if (!authUser) {
      throw new Error('User is not authenticated.');
    }

    if (authUser.providerData.some((provider) => provider.providerId === 'google.com')) {
      return 'linked';
    }

    const tokens = await googleAuth.acquireTokens();
    if (tokens.type === 'cancelled') {
      return 'cancelled';
    }

    const linkedUser = authUser.isAnonymous
      ? await linkAnonymousUserWithGoogleAuth(tokens, authUser.uid)
      : await linkCurrentUserWithGoogleAuth(tokens, authUser.uid);

    await ensureUserProfile(linkedUser);
    setAuthSnapshot(createAuthUserSnapshot(linkedUser));
    return 'linked';
  }, [authUser, googleAuth]);

  const disconnectGoogleAccount = useCallback(async (): Promise<void> => {
    if (!authUser) {
      throw new Error('User is not authenticated.');
    }

    const unlinkedUser = await unlinkGoogleFromCurrentUser(authUser.uid);
    setAuthSnapshot(createAuthUserSnapshot(unlinkedUser));
    await revokeNativeGoogleAccess().catch(() => undefined);
  }, [authUser]);

  const reauthenticateWithGoogle = useCallback(async (): Promise<'verified' | 'cancelled'> => {
    if (!authUser) {
      throw new Error('User is not authenticated.');
    }

    const tokens = await googleAuth.acquireTokens();
    if (tokens.type === 'cancelled') {
      return 'cancelled';
    }

    await reauthenticateCurrentUserWithGoogleAuth(tokens, authUser.uid);
    return 'verified';
  }, [authUser, googleAuth]);

  const revokeGoogleAccess = useCallback(async (): Promise<void> => {
    await revokeNativeGoogleAccess();
  }, []);

  const hasPasswordProvider = authSnapshot.providerIds.includes('password');
  const hasGoogleProvider = authSnapshot.providerIds.includes('google.com');

  return {
    authUser,
    profile,
    uiState,
    error,
    isAnonymous: Boolean(authUser?.isAnonymous),
    email: authUser?.email ?? profile?.email ?? null,
    hasPasswordProvider,
    hasGoogleProvider,
    isGoogleAuthReady: googleAuth.isReady,
    updateProfile,
    sendPasswordReset,
    linkAnonymousAccount,
    linkGoogleAccount,
    disconnectGoogleAccount,
    reauthenticateWithGoogle,
    revokeGoogleAccess,
    retry,
  };
}
