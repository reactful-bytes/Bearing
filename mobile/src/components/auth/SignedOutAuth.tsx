import { AuthCredential } from 'firebase/auth';
import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, spacing, typography } from '../../design/tokens';
import { useGoogleAuth } from '../../features/auth/useGoogleAuth';
import {
  completeGooglePasswordConflict,
  registerWithEmailPassword,
  sendPasswordResetForEmail,
  signInWithEmailPassword,
  signInWithGoogleAuth,
} from '../../services/firebase/firebaseAuthActions';
import { AppButton } from '../ui/AppButton';
import { FormField } from '../ui/FormField';
import { TextLink } from '../ui/TextLink';
import { AuthDivider } from './AuthDivider';
import { AuthShell } from './AuthShell';
import { GoogleAuthButton } from './GoogleAuthButton';

type AuthScreen = 'sign-in' | 'create-account' | 'forgot-password' | 'google-conflict';
type AuthOperation = 'email' | 'google' | 'reset' | 'recovery' | null;

type PendingGoogleConflict = {
  email: string;
  credential: AuthCredential;
};

function getAuthCopy(screen: AuthScreen): { heading: string; description: string } {
  switch (screen) {
    case 'create-account':
      return {
        heading: 'Create your account',
        description: 'Keep your plans, goals, notes, and schedule available across devices.',
      };
    case 'forgot-password':
      return {
        heading: 'Reset your password',
        description: 'Enter your account email and we’ll send a secure reset link.',
      };
    case 'google-conflict':
      return {
        heading: 'Keep your Bearing data',
        description:
          'This email already has a password account. Verify that password to add Google without changing your account or data.',
      };
    default:
      return {
        heading: 'Welcome back',
        description:
          'Sign in to find your schedule, goals, tasks, and notes right where you left them.',
      };
  }
}

export function SignedOutAuth() {
  const googleAuth = useGoogleAuth();
  const [screen, setScreen] = useState<AuthScreen>('sign-in');
  const [operation, setOperation] = useState<AuthOperation>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);
  const [pendingGoogleConflict, setPendingGoogleConflict] = useState<PendingGoogleConflict | null>(
    null,
  );
  const copy = getAuthCopy(screen);
  const isPending = operation !== null;

  function clearFeedback(): void {
    setError(null);
    setMessage(null);
  }

  function returnToSignIn(): void {
    clearFeedback();
    setPassword('');
    setConfirmPassword('');
    setPendingGoogleConflict(null);
    setResetSent(false);
    setScreen('sign-in');
  }

  async function handleEmailAuth(): Promise<void> {
    const trimmedEmail = email.trim();
    const trimmedDisplayName = displayName.trim();
    clearFeedback();

    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }

    if (!password) {
      setError('Password is required.');
      return;
    }

    if (screen === 'create-account') {
      if (!trimmedDisplayName) {
        setError('Display name is required to create an account.');
        return;
      }
      if (password.length < 6) {
        setError('Password must be at least 6 characters.');
        return;
      }
      if (password !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
    }

    setOperation('email');
    try {
      if (screen === 'create-account') {
        await registerWithEmailPassword(trimmedEmail, password, trimmedDisplayName);
      } else {
        await signInWithEmailPassword(trimmedEmail, password);
      }
      setPassword('');
      setConfirmPassword('');
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Authentication failed.');
    } finally {
      setOperation(null);
    }
  }

  async function handleGoogleAuth(): Promise<void> {
    clearFeedback();
    setPendingGoogleConflict(null);
    setOperation('google');
    try {
      const tokens = await googleAuth.acquireTokens();
      if (tokens.type === 'cancelled') return;

      const result = await signInWithGoogleAuth(tokens);
      if (result.type === 'password-conflict') {
        if (!result.email) {
          setError('Sign in with your existing email and password, then link Google from Profile.');
          return;
        }
        setEmail(result.email);
        setPassword('');
        setPendingGoogleConflict({ email: result.email, credential: result.credential });
        setScreen('google-conflict');
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : 'Google Sign-In failed.');
    } finally {
      setOperation(null);
    }
  }

  async function handlePasswordReset(): Promise<void> {
    const trimmedEmail = email.trim();
    clearFeedback();
    setResetSent(false);

    if (!trimmedEmail) {
      setError('Email is required.');
      return;
    }

    setOperation('reset');
    try {
      await sendPasswordResetForEmail(trimmedEmail);
      setResetSent(true);
      setMessage(
        'If an account exists for that email, a password reset link is on its way. Check your inbox and spam folder.',
      );
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : 'Password reset failed.');
    } finally {
      setOperation(null);
    }
  }

  async function handleGoogleConflict(): Promise<void> {
    clearFeedback();
    if (!pendingGoogleConflict) {
      setError('The Google sign-in request expired. Start again.');
      return;
    }
    if (!password) {
      setError('Password is required.');
      return;
    }

    setOperation('recovery');
    try {
      await completeGooglePasswordConflict(
        pendingGoogleConflict.email,
        password,
        pendingGoogleConflict.credential,
      );
      setPendingGoogleConflict(null);
      setPassword('');
    } catch (recoveryError) {
      setError(
        recoveryError instanceof Error ? recoveryError.message : 'Account verification failed.',
      );
    } finally {
      setOperation(null);
    }
  }

  if (screen === 'forgot-password') {
    return (
      <AuthShell heading={copy.heading} description={copy.description}>
        <View style={styles.formSection}>
          <FormField
            label="Email"
            accessibilityLabel="Password reset email"
            value={email}
            onChangeText={(value) => {
              setEmail(value);
              setResetSent(false);
              clearFeedback();
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="you@example.com"
          />
          <AuthFeedback error={error} message={message} />
          <AppButton
            accessibilityLabel="Send reset link"
            label={resetSent ? 'Send another link' : 'Send Reset Link'}
            loading={operation === 'reset'}
            loadingLabel="Sending..."
            disabled={isPending && operation !== 'reset'}
            onPress={() => void handlePasswordReset()}
          />
          <TextLink label="Back to sign in" disabled={isPending} onPress={returnToSignIn} />
        </View>
      </AuthShell>
    );
  }

  if (screen === 'google-conflict') {
    return (
      <AuthShell heading={copy.heading} description={copy.description}>
        <View style={styles.formSection}>
          <FormField
            label="Email"
            accessibilityLabel="Existing account email"
            value={pendingGoogleConflict?.email ?? email}
            editable={false}
          />
          <FormField
            label="Current password"
            accessibilityLabel="Existing account password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
          />
          <AuthFeedback error={error} message={message} />
          <AppButton
            accessibilityLabel="Verify password and link Google"
            label="Verify & Link Google"
            loading={operation === 'recovery'}
            loadingLabel="Verifying..."
            disabled={isPending && operation !== 'recovery'}
            onPress={() => void handleGoogleConflict()}
          />
          <TextLink
            label="Cancel and return to sign in"
            disabled={isPending}
            onPress={returnToSignIn}
          />
        </View>
      </AuthShell>
    );
  }

  const isCreateAccount = screen === 'create-account';

  return (
    <AuthShell heading={copy.heading} description={copy.description}>
      <View style={styles.providerSection}>
        <GoogleAuthButton
          disabled={!googleAuth.isReady || isPending}
          loading={operation === 'google'}
          onPress={() => void handleGoogleAuth()}
        />
        {!googleAuth.isConfigured ? (
          <Text style={styles.helper}>Google Sign-In is not configured for this build.</Text>
        ) : null}
      </View>

      <AuthDivider />

      <View style={styles.formSection}>
        {isCreateAccount ? (
          <FormField
            label="Display name"
            accessibilityLabel="Display name"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Your name"
          />
        ) : null}
        <FormField
          label="Email"
          accessibilityLabel="Email address"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="you@example.com"
        />
        <View style={styles.passwordGroup}>
          <FormField
            label="Password"
            accessibilityLabel="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholder="Password"
          />
          {!isCreateAccount ? (
            <TextLink
              label="Forgot password?"
              disabled={isPending}
              textStyle={styles.forgotLink}
              onPress={() => {
                clearFeedback();
                setPassword('');
                setScreen('forgot-password');
              }}
            />
          ) : null}
        </View>
        {isCreateAccount ? (
          <FormField
            label="Confirm password"
            accessibilityLabel="Confirm password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholder="Re-enter password"
          />
        ) : null}

        <AuthFeedback error={error} message={message} />

        <AppButton
          accessibilityLabel={isCreateAccount ? 'Create account' : 'Sign in'}
          label={isCreateAccount ? 'Create Account' : 'Sign In'}
          loading={operation === 'email'}
          loadingLabel={isCreateAccount ? 'Creating...' : 'Signing in...'}
          disabled={isPending && operation !== 'email'}
          onPress={() => void handleEmailAuth()}
        />
      </View>

      <View style={styles.accountPrompt}>
        <Text style={styles.promptText}>
          {isCreateAccount ? 'Already have an account?' : 'New to Bearing?'}
        </Text>
        <TextLink
          label={isCreateAccount ? 'Sign in' : 'Create an account'}
          disabled={isPending}
          onPress={() => {
            clearFeedback();
            setPassword('');
            setConfirmPassword('');
            setScreen(isCreateAccount ? 'sign-in' : 'create-account');
          }}
        />
      </View>
    </AuthShell>
  );
}

function AuthFeedback({ error, message }: { error: string | null; message: string | null }) {
  return (
    <View style={styles.feedbackRegion}>
      {error ? (
        <Text accessibilityLiveRegion="polite" accessibilityRole="alert" style={styles.errorText}>
          {error}
        </Text>
      ) : null}
      {!error && message ? (
        <Text accessibilityLiveRegion="polite" style={styles.successText}>
          {message}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  providerSection: {
    gap: spacing.sm,
  },
  formSection: {
    gap: spacing.md,
  },
  passwordGroup: {
    gap: 0,
  },
  forgotLink: {
    fontSize: 14,
  },
  helper: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  feedbackRegion: {
    minHeight: 20,
    justifyContent: 'center',
  },
  errorText: {
    ...typography.helper,
    color: colors.dangerText,
  },
  successText: {
    ...typography.helper,
    color: colors.brand,
  },
  accountPrompt: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: spacing.sm,
  },
  promptText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
