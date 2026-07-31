import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, User } from 'firebase/auth';

import {
  linkAnonymousUserWithEmailPassword,
  sendPasswordResetForEmail,
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
  updateProfile: (fields: UpdateUserProfileInput) => Promise<void>;
  sendPasswordReset: () => Promise<void>;
  linkAnonymousAccount: (input: {
    email: string;
    password: string;
    displayName: string;
  }) => Promise<void>;
};

export function useUserProfile(): UseUserProfileReturn {
  const [authUser, setAuthUser] = useState<User | null>(() => getFirebaseAuth().currentUser);
  const [profile, setProfile] = useState<UserProfileRecord | null>(null);
  const [uiState, setUiState] = useState<UserProfileUiState>('loading');
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const auth = getFirebaseAuth();

    return onAuthStateChanged(
      auth,
      (nextUser) => {
        setAuthUser(nextUser);
      },
      (authError) => {
        setUiState('error');
        setError(authError);
      },
    );
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
  }, [authUser]);

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
      setAuthUser(linkedUser);
    },
    [authUser],
  );

  return {
    authUser,
    profile,
    uiState,
    error,
    isAnonymous: Boolean(authUser?.isAnonymous),
    email: authUser?.email ?? profile?.email ?? null,
    updateProfile,
    sendPasswordReset,
    linkAnonymousAccount,
  };
}
