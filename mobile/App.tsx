import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AppButton } from './src/components/ui/AppButton';
import { FormField } from './src/components/ui/FormField';
import { AppTabs } from './src/navigation/AppTabs';
import { useAuthBootstrap } from './src/features/auth/useAuthBootstrap';
import {
  registerWithEmailPassword,
  sendPasswordResetForEmail,
  signInWithEmailPassword,
  signOutCurrentUser,
} from './src/services/firebase/firebaseAuthActions';
import { colors, layout, spacing, typography } from './src/design/tokens';

function AppContent() {
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <SafeAreaView style={styles.safeArea}>
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={styles.title}>Bearing</Text>

          {showLoading ? <Text style={styles.body}>Checking session...</Text> : null}
          {showSignedOut ? (
            <View style={styles.block}>
              <Text style={styles.body}>
                Sign in with email and password to access your schedule, goals, notes, and profile
                settings.
              </Text>

              <FormField
                label="Email"
                accessibilityLabel="Email address"
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder="you@example.com"
              />

              {authMode === 'create-account' ? (
                <FormField
                  label="Display name"
                  accessibilityLabel="Display name"
                  value={displayName}
                  onChangeText={setDisplayName}
                  placeholder="Your name"
                />
              ) : null}

              <FormField
                label="Password"
                accessibilityLabel="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                placeholder="Password"
              />

              {authMode === 'create-account' ? (
                <FormField
                  label="Confirm password"
                  accessibilityLabel="Confirm password"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  placeholder="Re-enter password"
                />
              ) : null}

              <AppButton
                accessibilityLabel={authMode === 'sign-in' ? 'Sign in' : 'Create account'}
                label={authMode === 'sign-in' ? 'Sign In' : 'Create Account'}
                loading={isAuthActionPending}
                loadingLabel="Working..."
                onPress={onPressAuthAction}
              />

              <AppButton
                variant="secondary"
                accessibilityLabel={
                  authMode === 'sign-in' ? 'Switch to create account' : 'Switch to sign in'
                }
                label={
                  authMode === 'sign-in'
                    ? 'Need an account? Create one'
                    : 'Already have an account? Sign in'
                }
                onPress={() => {
                  resetAuthFeedback();
                  setAuthMode((current) => (current === 'sign-in' ? 'create-account' : 'sign-in'));
                  resetAuthForm();
                }}
              />

              <AppButton
                variant="secondary"
                accessibilityLabel="Send password reset email"
                label="Send Password Reset Email"
                onPress={onPressPasswordReset}
              />

              <Text style={styles.helper}>
                If you are still on an older anonymous session, keep that session signed in and
                secure it later from the Profile tab so its data stays attached to the same account.
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
        </ScrollView>
      </SafeAreaView>

      <StatusBar style="auto" />
    </KeyboardAvoidingView>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
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
  },
  safeArea: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    justifyContent: 'center',
    paddingHorizontal: layout.pagePaddingHorizontal,
    paddingVertical: layout.pagePaddingVertical,
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
