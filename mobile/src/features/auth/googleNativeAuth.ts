import { Platform } from 'react-native';

import { assertGoogleOAuthConfigured } from '../../services/config/googleAuthEnv';

type NativeGoogleSigninClient = Pick<
  typeof import('@react-native-google-signin/google-signin').GoogleSignin,
  'configure' | 'getTokens' | 'hasPlayServices' | 'revokeAccess' | 'signIn' | 'signOut'
>;

export type GoogleTokenResult =
  { type: 'success'; idToken: string; accessToken: string | null } | { type: 'cancelled' };

let nativeClientPromise: Promise<NativeGoogleSigninClient> | null = null;
let configuredWebClientId: string | null = null;

function isDeveloperConfigurationError(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    String(error.code) === '10'
  );
}

async function getNativeGoogleSigninClient(): Promise<NativeGoogleSigninClient> {
  if (Platform.OS !== 'android') {
    throw new Error('Native Google Sign-In is only available on Android.');
  }

  if (!nativeClientPromise) {
    nativeClientPromise = import('@react-native-google-signin/google-signin').then(
      ({ GoogleSignin }) => GoogleSignin,
    );
  }

  return nativeClientPromise;
}

async function configureNativeGoogleSignIn(
  client: NativeGoogleSigninClient,
  webClientId: string,
): Promise<void> {
  if (configuredWebClientId === webClientId) {
    return;
  }

  client.configure({ webClientId });
  configuredWebClientId = webClientId;
}

export async function acquireNativeGoogleTokens(
  clientOverride?: NativeGoogleSigninClient,
): Promise<GoogleTokenResult> {
  const { webClientId } = assertGoogleOAuthConfigured('android');
  const client = clientOverride ?? (await getNativeGoogleSigninClient());

  await configureNativeGoogleSignIn(client, webClientId!);
  await client.hasPlayServices({ showPlayServicesUpdateDialog: true });

  let response: Awaited<ReturnType<NativeGoogleSigninClient['signIn']>>;

  try {
    response = await client.signIn();
  } catch (error) {
    if (isDeveloperConfigurationError(error)) {
      throw new Error(
        'Google Sign-In is not authorized for this Android build. Register package com.reactfulbytes.bearing and this build’s SHA-1/SHA-256 certificate fingerprints in the same Firebase/Google project as EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID.',
        { cause: error },
      );
    }

    throw error;
  }

  if (response.type !== 'success') {
    return { type: 'cancelled' };
  }

  const { accessToken, idToken } = await client.getTokens();

  if (!idToken) {
    throw new Error(
      'Google did not return an ID token. Check the Android web client ID and signing certificate configuration.',
    );
  }

  return { type: 'success', idToken, accessToken: accessToken || null };
}

export async function clearNativeGoogleSession(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const client = await getNativeGoogleSigninClient();
  await client.signOut();
}

export async function revokeNativeGoogleAccess(): Promise<void> {
  if (Platform.OS !== 'android') {
    return;
  }

  const client = await getNativeGoogleSigninClient();
  await client.revokeAccess();
}
