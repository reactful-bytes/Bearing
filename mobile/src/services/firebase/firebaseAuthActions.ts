import {
  AuthCredential,
  EmailAuthProvider,
  GoogleAuthProvider,
  OAuthCredential,
  createUserWithEmailAndPassword,
  linkWithCredential,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';

import { clearNativeGoogleSession } from '../../features/auth/googleNativeAuth';
import { GoogleTokenResult } from '../../features/auth/googleNativeAuth';
import { getFirebaseAuth } from './firebaseAuth';

type GoogleTokens = Extract<GoogleTokenResult, { type: 'success' }>;

export type GoogleSignInResult =
  | { type: 'success'; user: User }
  | {
      type: 'password-conflict';
      email: string | null;
      credential: OAuthCredential;
    };

const GOOGLE_COLLISION_CODES = new Set([
  'auth/account-exists-with-different-credential',
  'auth/credential-already-in-use',
  'auth/email-already-in-use',
]);

export class GoogleCredentialCollisionError extends Error {
  readonly code: string;

  constructor(code: string, options?: ErrorOptions) {
    super(
      'This Google account is already attached to another Bearing account. No accounts or data were changed.',
      options,
    );
    this.name = 'GoogleCredentialCollisionError';
    this.code = code;
  }
}

function getErrorCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('code' in error)) {
    return null;
  }

  return typeof error.code === 'string' ? error.code : null;
}

function getErrorEmail(error: unknown): string | null {
  if (typeof error !== 'object' || error === null || !('customData' in error)) {
    return null;
  }

  const customData = error.customData;

  if (typeof customData !== 'object' || customData === null || !('email' in customData)) {
    return null;
  }

  return typeof customData.email === 'string' ? customData.email.trim() || null : null;
}

function createGoogleCredential(tokens: GoogleTokens): OAuthCredential {
  return GoogleAuthProvider.credential(tokens.idToken, tokens.accessToken ?? undefined);
}

function throwGoogleOperationError(message: string, error: unknown): never {
  const code = getErrorCode(error);

  if (code && GOOGLE_COLLISION_CODES.has(code)) {
    throw new GoogleCredentialCollisionError(code, { cause: error });
  }

  throw new Error(message, { cause: error });
}

function requireExpectedCurrentUser(expectedUid: string): User {
  const currentUser = getFirebaseAuth().currentUser;

  if (!currentUser || currentUser.uid !== expectedUid) {
    throw new Error('The authenticated account changed during Google Sign-In. Please try again.');
  }

  return currentUser;
}

export async function signInWithAnonymousAuth(): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    await signInAnonymously(auth);
  } catch (error) {
    throw new Error('Failed to sign in anonymously.', {
      cause: error,
    });
  }
}

export async function signInWithEmailPassword(email: string, password: string): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    await signInWithEmailAndPassword(auth, email.trim(), password);
  } catch (error) {
    throw new Error('Failed to sign in with email and password.', {
      cause: error,
    });
  }
}

export async function signInWithGoogleAuth(tokens: GoogleTokens): Promise<GoogleSignInResult> {
  const credential = createGoogleCredential(tokens);

  try {
    const result = await signInWithCredential(getFirebaseAuth(), credential);
    return { type: 'success', user: result.user };
  } catch (error) {
    if (getErrorCode(error) === 'auth/account-exists-with-different-credential') {
      return {
        type: 'password-conflict',
        email: getErrorEmail(error),
        credential,
      };
    }

    throwGoogleOperationError('Failed to sign in with Google.', error);
  }
}

export async function completeGooglePasswordConflict(
  email: string,
  password: string,
  pendingCredential: AuthCredential,
): Promise<User> {
  try {
    const auth = getFirebaseAuth();
    const passwordResult = await signInWithEmailAndPassword(auth, email.trim(), password);
    const canonicalUid = passwordResult.user.uid;
    const linkedResult = await linkWithCredential(passwordResult.user, pendingCredential);

    if (linkedResult.user.uid !== canonicalUid) {
      throw new Error('Google linking returned a different account than the password sign-in.');
    }

    return linkedResult.user;
  } catch (error) {
    throwGoogleOperationError('Failed to verify and link the existing Bearing account.', error);
  }
}

async function linkCurrentUserWithGoogleCredential(
  tokens: GoogleTokens,
  expectedUid: string,
  expectedAnonymous: boolean,
): Promise<User> {
  try {
    const currentUser = requireExpectedCurrentUser(expectedUid);

    if (currentUser.isAnonymous !== expectedAnonymous) {
      throw new Error(
        expectedAnonymous
          ? 'The current account is no longer anonymous.'
          : 'Sign in to a secured account before linking Google.',
      );
    }

    const result = await linkWithCredential(currentUser, createGoogleCredential(tokens));

    if (result.user.uid !== expectedUid) {
      throw new Error('Google linking changed the Firebase user ID.');
    }

    return result.user;
  } catch (error) {
    throwGoogleOperationError('Failed to link Google to the current Bearing account.', error);
  }
}

export function linkAnonymousUserWithGoogleAuth(
  tokens: GoogleTokens,
  expectedUid: string,
): Promise<User> {
  return linkCurrentUserWithGoogleCredential(tokens, expectedUid, true);
}

export function linkCurrentUserWithGoogleAuth(
  tokens: GoogleTokens,
  expectedUid: string,
): Promise<User> {
  return linkCurrentUserWithGoogleCredential(tokens, expectedUid, false);
}

export async function reauthenticateCurrentUserWithGoogleAuth(
  tokens: GoogleTokens,
  expectedUid: string,
): Promise<void> {
  try {
    const currentUser = requireExpectedCurrentUser(expectedUid);
    await reauthenticateWithCredential(currentUser, createGoogleCredential(tokens));
  } catch (error) {
    throwGoogleOperationError('Failed to verify the current account with Google.', error);
  }
}

export async function registerWithEmailPassword(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  try {
    const auth = getFirebaseAuth();
    const result = await createUserWithEmailAndPassword(auth, email.trim(), password);
    const trimmedDisplayName = displayName.trim();

    if (trimmedDisplayName) {
      await updateProfile(result.user, { displayName: trimmedDisplayName });
    }

    return auth.currentUser ?? result.user;
  } catch (error) {
    throw new Error('Failed to create an email account.', {
      cause: error,
    });
  }
}

export async function linkAnonymousUserWithEmailPassword(
  email: string,
  password: string,
  displayName: string,
): Promise<User> {
  try {
    const auth = getFirebaseAuth();
    const currentUser = auth.currentUser;

    if (!currentUser) {
      throw new Error('User is not authenticated.');
    }

    if (!currentUser.isAnonymous) {
      throw new Error('Current user already has an email account.');
    }

    const credential = EmailAuthProvider.credential(email.trim(), password);
    const result = await linkWithCredential(currentUser, credential);
    const trimmedDisplayName = displayName.trim();

    if (trimmedDisplayName) {
      await updateProfile(result.user, { displayName: trimmedDisplayName });
    }

    return result.user;
  } catch (error) {
    throw new Error('Failed to secure the anonymous account with email and password.', {
      cause: error,
    });
  }
}

export async function sendPasswordResetForEmail(email: string): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    await sendPasswordResetEmail(auth, email.trim());
  } catch (error) {
    throw new Error('Failed to send password reset email.', {
      cause: error,
    });
  }
}

export async function reauthenticateCurrentUser(password: string): Promise<void> {
  try {
    const currentUser = getFirebaseAuth().currentUser;
    const email = currentUser?.email;

    if (!currentUser || !email) {
      throw new Error('An email account is required for password reauthentication.');
    }

    await reauthenticateWithCredential(currentUser, EmailAuthProvider.credential(email, password));
  } catch (error) {
    throw new Error('Failed to verify the current password.', { cause: error });
  }
}

export async function updateCurrentUserDisplayName(displayName: string): Promise<void> {
  try {
    const auth = getFirebaseAuth();

    if (!auth.currentUser) {
      throw new Error('User is not authenticated.');
    }

    await updateProfile(auth.currentUser, { displayName: displayName.trim() });
  } catch (error) {
    throw new Error('Failed to update user display name.', {
      cause: error,
    });
  }
}

export async function signOutCurrentUser(): Promise<void> {
  try {
    const auth = getFirebaseAuth();
    const hadGoogleProvider = Boolean(
      auth.currentUser?.providerData.some((provider) => provider.providerId === 'google.com'),
    );
    await signOut(auth);

    if (hadGoogleProvider) {
      await clearNativeGoogleSession().catch(() => undefined);
    }
  } catch (error) {
    throw new Error('Failed to sign out current user.', {
      cause: error,
    });
  }
}
