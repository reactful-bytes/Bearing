import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { AppTabs } from './src/navigation/AppTabs';
import { useAuthBootstrap } from './src/features/auth/useAuthBootstrap';
import {
  registerWithEmailPassword,
  sendPasswordResetForEmail,
  signInWithEmailPassword,
  signOutCurrentUser,
} from './src/services/firebase/firebaseAuthActions';
import { colors, componentTokens, layout, radii, spacing, typography } from './src/design/tokens';

export default function App() {
  const { status, user, error } = useAuthBootstrap();
  const [authActionError, setAuthActionError] = useState<string | null>(null);
  const [authActionMessage, setAuthActionMessage] = useState<string | null>(null);
  const [isAuthActionPending, setIsAuthActionPending] = useState(false);
  const [authMode, setAuthMode] = useState<'sign-in' | 'create-account'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const showSignedIn = status === 'authenticated' && user;
  const showSignedOut = status === 'unauthenticated';
  const showLoading = status === 'loading';
  const showError = status === 'error';

  function resetAuthFeedback(): void {
    setAuthActionError(null);
    setAuthActionMessage(null);
  }

  function resetAuthForm(): void {
    setPassword('');
    setConfirmPassword('');
  }

  const onPressAuthAction = async (): Promise<void> => {
    const trimmedEmail = email.trim();
    const trimmedDisplayName = displayName.trim();

    resetAuthFeedback();

    if (!trimmedEmail) {
      setAuthActionError('Email is required.');
      return;
    }

    if (!password) {
      setAuthActionError('Password is required.');
      return;
    }

    if (authMode === 'create-account') {
      if (!trimmedDisplayName) {
        setAuthActionError('Display name is required to create an account.');
        return;
      }

      if (password.length < 6) {
        setAuthActionError('Password must be at least 6 characters.');
        return;
      }

      if (password !== confirmPassword) {
        setAuthActionError('Passwords do not match.');
        return;
      }
    }

    setIsAuthActionPending(true);

    try {
      if (authMode === 'sign-in') {
        await signInWithEmailPassword(trimmedEmail, password);
      } else {
        await registerWithEmailPassword(trimmedEmail, password, trimmedDisplayName);
      }

      resetAuthForm();
    } catch (actionError) {
      setAuthActionError(
        actionError instanceof Error ? actionError.message : 'Authentication failed.',
      );
    } finally {
      setIsAuthActionPending(false);
    }
  };

  const onPressPasswordReset = async (): Promise<void> => {
    const trimmedEmail = email.trim();

    resetAuthFeedback();

    if (!trimmedEmail) {
      setAuthActionError('Enter your email address before sending a password reset.');
      return;
    }

    setIsAuthActionPending(true);

    try {
      await sendPasswordResetForEmail(trimmedEmail);
      setAuthActionMessage('Password reset email sent. Check your inbox.');
    } catch (actionError) {
      setAuthActionError(
        actionError instanceof Error ? actionError.message : 'Password reset failed.',
      );
    } finally {
      setIsAuthActionPending(false);
    }
  };

  const onPressSignOut = async (): Promise<void> => {
    resetAuthFeedback();
    setIsAuthActionPending(true);

    try {
      await signOutCurrentUser();
    } catch (actionError) {
      setAuthActionError(actionError instanceof Error ? actionError.message : 'Sign-out failed.');
    } finally {
      setIsAuthActionPending(false);
    }
  };

  if (showSignedIn) {
    return (
      <View style={styles.authenticatedContainer}>
        {authActionError ? (
          <View style={styles.authErrorBanner}>
            <Text style={styles.errorTitle}>Auth action error</Text>
            <Text style={styles.errorText}>{authActionError}</Text>
          </View>
        ) : null}
        <View style={styles.tabsContainer}>
          <AppTabs onPressSignOut={onPressSignOut} isSignOutPending={isAuthActionPending} />
        </View>
        <StatusBar style="auto" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bearing</Text>

      {showLoading ? <Text style={styles.body}>Checking session...</Text> : null}
      {showSignedOut ? (
        <View style={styles.block}>
          <Text style={styles.body}>
            Sign in with email and password to access your schedule, goals, notes, and profile
            settings.
          </Text>

          <View style={styles.formField}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              accessibilityLabel="Email address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="you@example.com"
              style={styles.input}
            />
          </View>

          {authMode === 'create-account' ? (
            <View style={styles.formField}>
              <Text style={styles.label}>Display name</Text>
              <TextInput
                accessibilityLabel="Display name"
                value={displayName}
                onChangeText={setDisplayName}
                placeholder="Your name"
                style={styles.input}
              />
            </View>
          ) : null}

          <View style={styles.formField}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              accessibilityLabel="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Password"
              style={styles.input}
            />
          </View>

          {authMode === 'create-account' ? (
            <View style={styles.formField}>
              <Text style={styles.label}>Confirm password</Text>
              <TextInput
                accessibilityLabel="Confirm password"
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry
                placeholder="Re-enter password"
                style={styles.input}
              />
            </View>
          ) : null}

          <Pressable
            onPress={onPressAuthAction}
            style={[styles.button, isAuthActionPending ? styles.buttonDisabled : null]}
            disabled={isAuthActionPending}
            accessibilityRole="button"
            accessibilityLabel={authMode === 'sign-in' ? 'Sign in' : 'Create account'}
          >
            <Text style={styles.buttonText}>
              {isAuthActionPending
                ? 'Working...'
                : authMode === 'sign-in'
                  ? 'Sign In'
                  : 'Create Account'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              authMode === 'sign-in' ? 'Switch to create account' : 'Switch to sign in'
            }
            onPress={() => {
              resetAuthFeedback();
              setAuthMode((current) => (current === 'sign-in' ? 'create-account' : 'sign-in'));
              resetAuthForm();
            }}
            style={({ pressed }) => [styles.secondaryButton, pressed ? styles.buttonPressed : null]}
          >
            <Text style={styles.secondaryButtonText}>
              {authMode === 'sign-in'
                ? 'Need an account? Create one'
                : 'Already have an account? Sign in'}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Send password reset email"
            onPress={onPressPasswordReset}
            style={({ pressed }) => [styles.linkButton, pressed ? styles.buttonPressed : null]}
          >
            <Text style={styles.linkButtonText}>Send Password Reset Email</Text>
          </Pressable>

          <Text style={styles.helper}>
            If you are still on an older anonymous session, keep that session signed in and secure
            it later from the Profile tab so its data stays attached to the same account.
          </Text>
        </View>
      ) : null}

      {authActionMessage ? (
        <View style={styles.block}>
          <Text style={styles.successTitle}>Auth update</Text>
          <Text style={styles.successText}>{authActionMessage}</Text>
        </View>
      ) : null}

      {authActionError ? (
        <View style={styles.block}>
          <Text style={styles.errorTitle}>Auth action error</Text>
          <Text style={styles.errorText}>{authActionError}</Text>
        </View>
      ) : null}

      {showError ? (
        <View style={styles.block}>
          <Text style={styles.errorTitle}>Startup error</Text>
          <Text style={styles.errorText}>{error?.message ?? 'Unknown startup error.'}</Text>
        </View>
      ) : null}

      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  authenticatedContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabsContainer: {
    flex: 1,
  },
  authErrorBanner: {
    paddingHorizontal: layout.pagePaddingHorizontal,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    gap: spacing.xs,
    backgroundColor: colors.dangerSurface,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    alignItems: 'flex-start',
    justifyContent: 'center',
    paddingHorizontal: layout.pagePaddingHorizontal,
    gap: spacing.md,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  block: {
    width: '100%',
    gap: spacing.sm,
  },
  body: {
    ...typography.body,
    color: colors.textPrimary,
  },
  helper: {
    ...typography.helper,
    color: colors.textSecondary,
  },
  label: {
    ...typography.label,
    color: colors.textSecondary,
  },
  formField: {
    width: '100%',
    gap: spacing.sm,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    width: '100%',
  },
  button: {
    alignSelf: 'flex-start',
    borderRadius: componentTokens.button.borderRadius,
    paddingHorizontal: componentTokens.button.paddingHorizontal,
    paddingVertical: componentTokens.button.paddingVertical,
    backgroundColor: componentTokens.button.backgroundColor,
  },
  buttonText: {
    color: componentTokens.button.textColor,
    ...typography.button,
  },
  secondaryButton: {
    alignSelf: 'flex-start',
    borderRadius: componentTokens.button.borderRadius,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surfaceMuted,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.textPrimary,
  },
  linkButton: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  linkButtonText: {
    ...typography.helper,
    color: colors.brand,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonPressed: {
    opacity: 0.88,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.dangerText,
  },
  errorText: {
    fontSize: 14,
    color: colors.dangerText,
  },
  successTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.brand,
  },
  successText: {
    fontSize: 14,
    color: colors.brand,
  },
});
