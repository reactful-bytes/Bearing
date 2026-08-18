import { Platform } from 'react-native';

export type GoogleOAuthConfig = {
  webClientId: string | null;
  iosClientId: string | null;
  androidClientId: string | null;
};

function readClientId(value: string | undefined): string | null {
  const clientId = value?.trim();

  if (!clientId || !clientId.endsWith('.apps.googleusercontent.com')) {
    return null;
  }

  return clientId;
}

export function getGoogleOAuthConfig(): GoogleOAuthConfig {
  return {
    webClientId: readClientId(process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID),
    iosClientId: readClientId(process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID),
    androidClientId: readClientId(process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID),
  };
}

export function assertGoogleOAuthConfigured(
  platform: typeof Platform.OS = Platform.OS,
): GoogleOAuthConfig {
  const config = getGoogleOAuthConfig();

  if (platform === 'android' && !config.webClientId) {
    throw new Error(
      'Google Sign-In is not configured for Android. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and rebuild the development client.',
    );
  }

  if (platform === 'ios' && !config.iosClientId) {
    throw new Error(
      'Google Sign-In is not configured for iOS. Add EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID and rebuild the development client.',
    );
  }

  if (platform === 'web' && !config.webClientId) {
    throw new Error(
      'Google Sign-In is not configured for web. Add EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID and register this web origin.',
    );
  }

  return config;
}

export function hasGoogleOAuthConfig(platform: typeof Platform.OS = Platform.OS): boolean {
  const config = getGoogleOAuthConfig();

  if (platform === 'android' || platform === 'web') {
    return Boolean(config.webClientId);
  }

  if (platform === 'ios') {
    return Boolean(config.iosClientId);
  }

  return false;
}