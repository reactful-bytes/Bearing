import { AuthSessionResult, makeRedirectUri } from 'expo-auth-session';
import * as Google from 'expo-auth-session/providers/google';
import * as WebBrowser from 'expo-web-browser';
import { useCallback } from 'react';
import { Platform } from 'react-native';

import {
  assertGoogleOAuthConfigured,
  getGoogleOAuthConfig,
  hasGoogleOAuthConfig,
} from '../../services/config/googleAuthEnv';
import { acquireNativeGoogleTokens, GoogleTokenResult } from './googleNativeAuth';

WebBrowser.maybeCompleteAuthSession();

export function parseGoogleAuthSessionResult(result: AuthSessionResult): GoogleTokenResult {
  if (result.type === 'cancel' || result.type === 'dismiss') {
    return { type: 'cancelled' };
  }

  if (result.type !== 'success') {
    throw new Error('Google Sign-In could not be completed. Please try again.');
  }

  const idToken = result.params.id_token ?? result.authentication?.idToken;

  if (!idToken) {
    throw new Error('Google did not return an ID token. Check this platform’s OAuth client.');
  }

  return {
    type: 'success',
    idToken,
    accessToken: result.authentication?.accessToken ?? result.params.access_token ?? null,
  };
}

export type UseGoogleAuthReturn = {
  isConfigured: boolean;
  isReady: boolean;
  acquireTokens: () => Promise<GoogleTokenResult>;
};

export function useGoogleAuth(): UseGoogleAuthReturn {
  const config = getGoogleOAuthConfig();
  const usesNativeGoogleSignIn = Platform.OS === 'android';
  const redirectUri = makeRedirectUri({
    scheme: 'bearing',
    path: 'oauthredirect',
    native: 'bearing:/oauthredirect',
  });
  const [request, , promptAsync] = Google.useIdTokenAuthRequest({
    clientId: config.webClientId ?? config.iosClientId ?? 'missing-google-client-id',
    iosClientId: config.iosClientId ?? undefined,
    androidClientId: config.androidClientId ?? undefined,
    webClientId: config.webClientId ?? undefined,
    redirectUri,
    scopes: ['openid', 'profile', 'email'],
    selectAccount: true,
  });

  const acquireTokens = useCallback(async (): Promise<GoogleTokenResult> => {
    if (usesNativeGoogleSignIn) {
      return acquireNativeGoogleTokens();
    }

    assertGoogleOAuthConfigured(Platform.OS);

    if (!request) {
      throw new Error('Google Sign-In is still loading. Please try again.');
    }

    return parseGoogleAuthSessionResult(await promptAsync());
  }, [promptAsync, request, usesNativeGoogleSignIn]);

  const isConfigured = hasGoogleOAuthConfig();

  return {
    isConfigured,
    isReady: isConfigured && (usesNativeGoogleSignIn || Boolean(request)),
    acquireTokens,
  };
}
