import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AuthShell } from './src/components/auth/AuthShell';
import { SignedOutAuth } from './src/components/auth/SignedOutAuth';
import { RecoveryCard } from './src/components/ui/RecoveryCard';
import { AppTabs } from './src/navigation/AppTabs';
import { useAuthBootstrap } from './src/features/auth/useAuthBootstrap';
import { signOutCurrentUser } from './src/services/firebase/firebaseAuthActions';
import { colors, layout, spacing, typography } from './src/design/tokens';

function AppContent() {
  const { status, user, error, retry } = useAuthBootstrap();
  const [authActionError, setAuthActionError] = useState<string | null>(null);
  const [isAuthActionPending, setIsAuthActionPending] = useState(false);

  const showSignedIn = status === 'authenticated' && user;
  const showSignedOut = status === 'unauthenticated';
  const showLoading = status === 'loading';
  const showError = status === 'error';

  const onPressSignOut = async (): Promise<void> => {
    setAuthActionError(null);
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
          {showSignedOut ? <SignedOutAuth /> : null}
          {showLoading ? (
            <AuthShell heading="Finding your bearings" description="Checking this device session.">
              <Text style={styles.body}>Checking session...</Text>
            </AuthShell>
          ) : null}
          {showError ? (
            <AuthShell
              heading="Unable to start Bearing"
              description="The app could not finish checking your account session."
            >
              <RecoveryCard
                title="Startup error"
                description={error?.message ?? 'Unknown startup error.'}
                onRetry={retry}
              />
            </AuthShell>
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
  body: {
    ...typography.body,
    color: colors.textPrimary,
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
});
