import {
  EmailAuthProvider,
  createUserWithEmailAndPassword,
  linkWithCredential,
  reauthenticateWithCredential,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  User,
} from 'firebase/auth';

import { getFirebaseAuth } from './firebaseAuth';

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
    await signOut(auth);
  } catch (error) {
    throw new Error('Failed to sign out current user.', {
      cause: error,
    });
  }
}
