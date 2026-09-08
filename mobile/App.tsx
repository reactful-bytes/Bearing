import { StatusBar } from 'expo-status-bar';
import { NavigationBar } from 'expo-navigation-bar';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { AuthShell } from './src/components/auth/AuthShell';
import { SignedOutAuth } from './src/components/auth/SignedOutAuth';
import { RecoveryCard } from './src/components/ui/RecoveryCard';
import { FoundationGallery } from './src/components/ui/FoundationGallery';
import { AppTabs } from './src/navigation/AppTabs';
import { useAuthBootstrap } from './src/features/auth/useAuthBootstrap';
import { signOutCurrentUser } from './src/services/firebase/firebaseAuthActions';
import { ThemeProvider, useTheme } from './src/design/ThemeProvider';
import { useThemedStyles } from './src/design/useThemedStyles';

const topographicBackgrounds = {
  dark: require('./assets/topographic-dark.png'),
  light: require('./assets/topographic-light.png'),
} as const;

const bearingMarks = {
  dark: require('./assets/launch-mark-white.png'),
  light: require('./assets/launch-mark-blue.png'),
} as const;

function AppContent() {
  const { status, user, error, retry } = useAuthBootstrap();
  const { preference, isHydrated } = useTheme();
  const styles = useThemedStyles(createStyles);
  const [authActionError, setAuthActionError] = useState<string | null>(null);
  const [isAuthActionPending, setIsAuthActionPending] = useState(false);
  const [isSplashHidden, setIsSplashHidden] = useState(false);
  const [isDestinationVisible, setIsDestinationVisible] = useState(false);

  const showSignedIn = status === 'authenticated' && user;
  const showSignedOut = status === 'unauthenticated';
  const showLoading = status === 'loading';
  const showError = status === 'error';
  const isAppReady = isHydrated && !showLoading;

  useEffect(() => {
    if (!isAppReady) {
      return;
    }

    let isMounted = true;
    void SplashScreen.hideAsync().finally(() => {
      if (isMounted) {
        setIsSplashHidden(true);
        requestAnimationFrame(() => {
          if (isMounted) {
            setIsDestinationVisible(true);
          }
        });
      }
    });

    return () => {
      isMounted = false;
    };
  }, [isAppReady]);

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

  if (!isAppReady) {
    return <StartupOverlay />;
  }

  if (!isSplashHidden || !isDestinationVisible) {
    return <StartupOverlay />;
  }

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
        <StatusBar style={preference === 'dark' ? 'light' : 'dark'} />
      </View>
    );
  }

  return (
    <View style={styles.authScreen}>
      <Image
        accessibilityElementsHidden
        resizeMode="cover"
        source={topographicBackgrounds[preference]}
        style={styles.authBackdrop}
      />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <SafeAreaView edges={['top', 'right', 'left']} style={styles.safeArea}>
          <View style={styles.authViewport}>
            <ScrollView
              contentContainerStyle={styles.contentContainer}
              keyboardShouldPersistTaps="handled"
            >
              {showSignedOut ? <SignedOutAuth /> : null}
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
          </View>
        </SafeAreaView>

        <StatusBar style={preference === 'dark' ? 'light' : 'dark'} />
      </KeyboardAvoidingView>
    </View>
  );
}

function StartupOverlay() {
  const { preference } = useTheme();
  const styles = useThemedStyles(createStyles);

  return (
    <View style={styles.startupOverlay} accessibilityLabel="Loading Bearing">
      <Image
        accessibilityElementsHidden
        resizeMode="cover"
        source={topographicBackgrounds[preference]}
        style={styles.startupBackdrop}
      />
      <Image
        accessibilityLabel="Bearing logo"
        source={bearingMarks[preference]}
        style={styles.startupLogo}
      />
      <ActivityIndicator accessibilityLabel="Loading" color={styles.startupSpinner.color} />
    </View>
  );
}

export default function App() {
  const showFoundationGallery = process.env.EXPO_PUBLIC_FOUNDATION_GALLERY === 'true';

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <ThemedNavigationBar />
        {showFoundationGallery ? <FoundationGallery /> : <AppContent />}
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

function ThemedNavigationBar() {
  const { preference } = useTheme();

  return <NavigationBar style={preference === 'dark' ? 'light' : 'dark'} />;
}

const createStyles = (theme: ReturnType<typeof useTheme>['theme']) =>
  StyleSheet.create({
    authenticatedContainer: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    tabsContainer: {
      flex: 1,
    },
    authErrorBanner: {
      paddingHorizontal: theme.layout.pagePaddingHorizontal,
      paddingTop: theme.spacing.xl,
      paddingBottom: theme.spacing.md,
      gap: theme.spacing.xs,
      backgroundColor: theme.colors.dangerSurface,
    },
    container: {
      flex: 1,
    },
    authScreen: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    safeArea: {
      flex: 1,
    },
    authViewport: {
      flex: 1,
      overflow: 'hidden',
    },
    authBackdrop: {
      ...StyleSheet.absoluteFill,
      opacity: 0.38,
      width: '100%',
      height: '100%',
    },
    startupOverlay: {
      ...StyleSheet.absoluteFill,
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.lg,
      backgroundColor: theme.colors.background,
      overflow: 'hidden',
    },
    startupBackdrop: {
      ...StyleSheet.absoluteFill,
      opacity: 0.38,
    },
    startupLogo: {
      width: 124,
      height: 124,
      resizeMode: 'contain',
    },
    startupSpinner: {
      color: theme.colors.textSecondary,
    },
    contentContainer: {
      flexGrow: 1,
      width: '100%',
      maxWidth: 560,
      alignSelf: 'center',
      justifyContent: 'center',
      paddingHorizontal: theme.layout.pagePaddingHorizontal,
      paddingVertical: theme.layout.pagePaddingVertical,
      gap: theme.spacing.md,
    },
    body: {
      ...theme.typography.body,
      color: theme.colors.textPrimary,
    },
    errorTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: theme.colors.dangerText,
    },
    errorText: {
      fontSize: 14,
      color: theme.colors.dangerText,
    },
  });
