import { afterEach, describe, expect, it, jest } from '@jest/globals';

import { acquireNativeGoogleTokens } from './googleNativeAuth';

const originalWebClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

function createClient(responseType: 'success' | 'cancelled' = 'success') {
  return {
    configure: jest.fn(),
    getTokens: jest.fn(async () => ({ accessToken: 'access-token', idToken: 'id-token' })),
    hasPlayServices: jest.fn(async () => true),
    revokeAccess: jest.fn(async () => undefined),
    signIn: jest.fn(async () => ({ type: responseType })),
    signOut: jest.fn(async () => undefined),
  };
}

describe('Google native authentication', () => {
  afterEach(() => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = originalWebClientId;
  });

  it('returns Firebase-compatible Android tokens', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web.apps.googleusercontent.com';
    const client = createClient();

    await expect(acquireNativeGoogleTokens(client as never)).resolves.toEqual({
      type: 'success',
      idToken: 'id-token',
      accessToken: 'access-token',
    });
    expect(client.hasPlayServices).toHaveBeenCalledWith({
      showPlayServicesUpdateDialog: true,
    });
  });

  it('normalizes native cancellation without requesting tokens', async () => {
    process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'web.apps.googleusercontent.com';
    const client = createClient('cancelled');

    await expect(acquireNativeGoogleTokens(client as never)).resolves.toEqual({
      type: 'cancelled',
    });
    expect(client.getTokens).not.toHaveBeenCalled();
  });

  it('rejects a missing Android web client configuration', async () => {
    delete process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

    await expect(acquireNativeGoogleTokens(createClient() as never)).rejects.toThrow(
      'Google Sign-In is not configured for Android',
    );
  });
});