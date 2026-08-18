import { Platform } from 'react-native';

import { assertGoogleOAuthConfigured } from '../../services/config/googleAuthEnv';

type NativeGoogleSigninClient = Pick<
  typeof import('@react-native-google-signin/google-signin').GoogleSignin,
  | 'configure'
  | 'getTokens'
  | 'hasPlayServices'
  | 'revokeAccess'
  | 'signIn'
  | 'signOut'
>;

export type GoogleTokenResult =
  | { type: 'success'; idToken: string; accessToken: string | null }
  | { type: 'cancelled' };

let nativeClientPromise: Promise<NativeGoogleSigninClient> | null = null;
let configuredWebClientId: string | null = null;

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

  const response = await client.signIn();

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